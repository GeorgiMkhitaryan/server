import {
  Injectable,
  Logger,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common'
import * as WebSocket from 'ws'
import { Server } from 'http'
import { ChargerService } from 'src/ocpp/services/charger.service'

type ClientState = {
  id: string
  ws: WebSocket.WebSocket
  connectedAt: number
}

@Injectable()
export class WsClientGateway implements OnModuleDestroy {
  constructor(
    @Inject(forwardRef(() => ChargerService))
    private chargerService: ChargerService,
  ) {}
  private wss: WebSocket.Server | null = null
  private readonly logger = new Logger(WsClientGateway.name)
  private clients = new Map<WebSocket.WebSocket, ClientState>()

  initializeWebSocketServer(httpServer: Server) {
    try {
      this.wss = new WebSocket.Server({
        noServer: true,
        perMessageDeflate: false,
        clientTracking: true,
      })

      httpServer.on('upgrade', (request: any, socket: any, head: Buffer) => {
        const url = request.url || ''
        if (url.startsWith('/client')) {
          this.logger.debug(`Handling WebSocket client upgrade: ${url}`)
          this.wss!.handleUpgrade(
            request,
            socket,
            head,
            (ws: WebSocket.WebSocket) => {
              this.wss!.emit('connection', ws, request)
            },
          )
        }
      })

      this.wss.on('connection', this.handleConnection.bind(this))

      this.wss.on('error', (error) => {
        this.logger.error(
          `WebSocket Client server error: ${error.message}`,
          error.stack,
        )
      })

      this.logger.log('WebSocket Client server initialized successfully')
      this.logger.log('  Endpoint: /client?id={clientId}')
      this.logger.log('  Protocol: Custom WebSocket')
    } catch (error) {
      this.logger.error(
        `Failed to initialize WebSocket Client server: ${error.message}`,
        error.stack,
      )
      throw error
    }
  }

  async handleConnection(ws: WebSocket.WebSocket, req: any) {
    try {
      const url = req.url || ''
      const parsedUrl = new URL(url, 'http://localhost')
      const id = parsedUrl.searchParams.get('id') || crypto.randomUUID()

      this.logger.log(`Client connected: ${id}`)

      this.clients.set(ws, {
        id,
        ws,
        connectedAt: Date.now(),
      })

      const chargers = await this.chargerService.getAllChargers()

      ws.send(
        JSON.stringify({
          type: 'connected',
          id,
          chargers: chargers,
        }),
      )

      ws.on('message', (data: WebSocket.RawData) => {
        this.handleMessage(ws, data)
      })

      ws.on('error', (error: Error) => {
        this.logger.error(`WebSocket error for client ${id}: ${error.message}`)
      })

      ws.on('close', () => {
        this.handleDisconnect(ws)
      })
    } catch (error) {
      this.logger.error(
        `Error handling client connection: ${error.message}`,
        error.stack,
      )
      ws.close(1006, 'Connection error')
    }
  }

  private handleMessage(ws: WebSocket.WebSocket, data: WebSocket.RawData) {
    try {
      let message: any
      try {
        const messageStr =
          data instanceof Buffer ? data.toString() : String(data)
        message = JSON.parse(messageStr)
      } catch (error) {
        this.logger.error(`Invalid JSON message from client`)
        return
      }
      this.logger.debug(`Received message from client`)
      if (message.type === 'ping') {
        this.onPing(ws)
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack)
    }
  }

  handleDisconnect(ws: WebSocket.WebSocket) {
    const client = this.clients.get(ws)
    if (client) {
      this.logger.log(`Client disconnected: ${client.id}`)
      this.clients.delete(ws)
    }
  }

  onPing(ws: WebSocket.WebSocket) {
    if (ws.readyState === WebSocket.WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
    }
  }

  broadcast(payload: unknown) {
    const msg = JSON.stringify(payload)
    let sentCount = 0
    for (const c of this.clients.values()) {
      try {
        if (c.ws.readyState === WebSocket.WebSocket.OPEN) {
          c.ws.send(msg)
          sentCount++
        }
      } catch (error: any) {
        this.logger.error(
          `Error sending message to client ${c.id}: ${error.message}`,
        )
      }
    }
    this.logger.debug(`Broadcast message sent to ${sentCount} clients`)
  }

  onModuleDestroy() {
    if (this.wss) {
      this.wss.close()
      this.logger.log('WebSocket Client server closed')
    }
  }

  listClients() {
    return [...this.clients.values()].map((c) => ({
      id: c.id,
      connectedAt: c.connectedAt,
    }))
  }

  getClientCount(): number {
    return this.clients.size
  }
}
