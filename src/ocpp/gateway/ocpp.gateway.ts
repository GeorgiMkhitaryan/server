import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common'
import { Server } from 'http'
import * as WebSocket from 'ws'
import * as url from 'url'
import { ChargerService } from '../services/charger.service'
import { TransactionService } from '../services/transaction.service'
import { AuthService } from '../services/auth.service'
import {
  OCPPAction,
  OCPPMessageType,
  OCPPErrorCode,
} from '../interfaces/ocpp-message.interface'
import {
  BootNotificationRequestDto,
  BootNotificationResponseDto,
} from '../dto/boot-notification.dto'
import { AuthorizeRequestDto, AuthorizeResponseDto } from '../dto/authorize.dto'
import {
  StartTransactionRequestDto,
  StartTransactionResponseDto,
  StopTransactionRequestDto,
  StopTransactionResponseDto,
} from '../dto/transaction.dto'
import { StatusNotificationRequestDto } from '../dto/status-notification.dto'
import { MeterValuesRequestDto } from '../dto/meter-values.dto'
import { HeartbeatResponseDto } from '../dto/heartbeat.dto'
import { v4 as uuidv4 } from 'uuid'

interface OCPPWebSocket extends WebSocket {
  chargerId?: string
  isAlive?: boolean
}

@Injectable()
export class OCPPGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OCPPGateway.name)
  private wss: WebSocket.Server | null = null
  private chargerSockets: Map<string, OCPPWebSocket> = new Map()
  private pendingCallbacks: Map<string, (response: any) => void> = new Map()
  private pingInterval: NodeJS.Timeout | null = null

  constructor(
    private chargerService: ChargerService,
    private transactionService: TransactionService,
    private authService: AuthService,
  ) {}

  onModuleInit() {
    this.logger.log('OCPP Gateway module initialized')
  }

  initializeWebSocketServer(httpServer: Server) {
    try {
      this.wss = new WebSocket.Server({
        server: httpServer,
        perMessageDeflate: false,
        clientTracking: true,
        verifyClient: (info) => {
          // Only accept connections to /ocpp paths
          const url = info.req.url || ''
          if (url.startsWith('/ocpp')) {
            this.logger.debug(`Accepting WebSocket connection: ${url}`)
            return true
          }
          this.logger.warn(`Rejecting WebSocket connection to: ${url}`)
          return false
        },
      })

      this.wss.on('connection', this.handleConnection.bind(this))

      this.wss.on('error', (error) => {
        this.logger.error(
          `WebSocket server error: ${error.message}`,
          error.stack,
        )
      })

      this.logger.log('WebSocket server initialized successfully')
      this.logger.log('  Accepts: ws://localhost:3000/ocpp')
      this.logger.log('  Accepts: ws://localhost:3000/ocpp/{chargerId}')
      this.logger.log(
        '  Accepts: ws://user:pass@localhost:3000/ocpp/{chargerId}',
      )
    } catch (error) {
      this.logger.error(
        `Failed to initialize WebSocket server: ${error.message}`,
        error.stack,
      )
      throw error
    }

    // Set up ping/pong to keep connections alive
    this.pingInterval = setInterval(() => {
      this.chargerSockets.forEach((ws, chargerId) => {
        const ocppWs = ws as OCPPWebSocket
        if (ocppWs.isAlive === false) {
          this.logger.warn(`Charger ${chargerId} connection dead, terminating`)
          ws.terminate()
          return
        }
        ocppWs.isAlive = false
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping()
        }
      })
    }, 30000) // Ping every 30 seconds
  }

  onModuleDestroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    if (this.wss) {
      this.wss.close()
    }
    this.logger.log('OCPP Gateway destroyed')
  }

  private handleConnection(client: OCPPWebSocket, request: any) {
    try {
      client.isAlive = true
      const requestUrl = request.url || ''
      const parsedUrl = url.parse(requestUrl, true)
      let chargerId: string | null = null

      if (parsedUrl.pathname) {
        const pathParts = parsedUrl.pathname.split('/').filter(Boolean)

        const ocppIndex = pathParts.indexOf('ocpp')
        if (ocppIndex !== -1 && pathParts.length > ocppIndex + 1) {
          chargerId = pathParts[ocppIndex + 1]
        }
      }

      // Try to get from query params as fallback
      if (!chargerId && parsedUrl.query && parsedUrl.query.chargerId) {
        chargerId = parsedUrl.query.chargerId as string
      }

      // Check headers as fallback
      if (!chargerId && request.headers) {
        chargerId = (request.headers['x-charger-id'] as string) || null
      }

      // Fallback to generating an ID
      if (!chargerId) {
        chargerId = `charger-${uuidv4().substring(0, 8)}`
        this.logger.warn(`No chargerId provided, generated: ${chargerId}`)
      }

      // Handle basic auth if present (we accept any credentials for now)
      if (parsedUrl.auth) {
        const [username] = parsedUrl.auth.split(':')
        this.logger.debug(`Connection with auth user: ${username}***`)
      }

      client.chargerId = chargerId
      this.chargerSockets.set(chargerId, client)
      this.chargerService.registerConnection(chargerId, chargerId)

      this.logger.log(`Charger ${chargerId} connected`)
      this.logger.debug(`Connection URL: ${requestUrl}`)

      // Set up ping/pong handlers
      client.on('pong', () => {
        client.isAlive = true
      })

      // Handle incoming messages
      client.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data, client)
      })

      // Handle errors
      client.on('error', (error) => {
        this.logger.error(
          `WebSocket error for charger ${chargerId}: ${error.message}`,
        )
      })

      // Handle close
      client.on('close', () => {
        this.handleDisconnect(client)
      })
    } catch (error) {
      this.logger.error(
        `Error handling connection: ${error.message}`,
        error.stack,
      )
      client.close(1006, 'Connection error')
    }
  }

  private handleDisconnect(client: OCPPWebSocket) {
    const chargerId = client.chargerId
    if (chargerId) {
      this.chargerSockets.delete(chargerId)
      this.chargerService.unregisterConnection(chargerId)
      this.logger.log(`Charger ${chargerId} disconnected`)
    }
  }

  private handleMessage(data: WebSocket.Data, client: OCPPWebSocket) {
    try {
      const chargerId = client.chargerId
      if (!chargerId) {
        this.logger.error('Charger ID not found for socket')
        return
      }

      // Parse JSON message
      let message: any
      try {
        const messageStr =
          data instanceof Buffer ? data.toString() : String(data)
        message = JSON.parse(messageStr)
      } catch (error) {
        this.logger.error(
          `Invalid JSON message from charger ${chargerId}: ${data}`,
        )
        return
      }
      this.logger.log(message, 'client>>>>>>>>>>>>>>>>>>>>>>>>>', chargerId)
      // Parse OCPP message format: [MessageType, MessageId, ActionName, Payload]
      if (!Array.isArray(message) || message.length < 3) {
        this.logger.error(
          `Invalid OCPP message format from charger ${chargerId}`,
        )
        return
      }

      const messageType = message[0]
      const messageId = message[1]

      if (messageType === OCPPMessageType.CALL) {
        // Incoming call from charger
        const action = message[2] as OCPPAction
        const payload = message[3] || {}

        this.logger.debug(`Received ${action} from charger ${chargerId}`)

        this.handleIncomingCall(chargerId, messageId, action, payload, client)
      } else if (messageType === OCPPMessageType.CALLRESULT) {
        // Response to our call
        const payload = message[2]
        this.handleCallResult(messageId, payload)
      } else if (messageType === OCPPMessageType.CALLERROR) {
        // Error response
        const errorPayload = message[2]
        this.handleCallError(messageId, errorPayload)
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack)
    }
  }

  private handleIncomingCall(
    chargerId: string,
    messageId: string,
    action: OCPPAction,
    payload: any,
    client: OCPPWebSocket,
  ) {
    switch (action) {
      case OCPPAction.BootNotification:
        this.handleBootNotification(chargerId, messageId, payload, client)
        break
      case OCPPAction.Authorize:
        this.handleAuthorize(chargerId, messageId, payload, client)
        break
      case OCPPAction.StartTransaction:
        this.handleStartTransaction(chargerId, messageId, payload, client)
        break
      case OCPPAction.StopTransaction:
        this.handleStopTransaction(chargerId, messageId, payload, client)
        break
      case OCPPAction.StatusNotification:
        this.handleStatusNotification(chargerId, messageId, payload, client)
        break
      case OCPPAction.MeterValues:
        this.handleMeterValues(chargerId, messageId, payload, client)
        break
      case OCPPAction.Heartbeat:
        this.handleHeartbeat(chargerId, messageId, payload, client)
        break
      default:
        this.sendError(
          client,
          messageId,
          OCPPErrorCode.NotImplemented,
          `Action ${action} not implemented`,
        )
    }
  }

  private handleBootNotification(
    chargerId: string,
    messageId: string,
    payload: BootNotificationRequestDto,
    client: OCPPWebSocket,
  ) {
    // Create or update charger
    let charger = this.chargerService.getCharger(chargerId)
    if (!charger) {
      charger = this.chargerService.createCharger({
        id: chargerId,
        chargePointVendor: payload.chargePointVendor,
        chargePointModel: payload.chargePointModel,
        chargePointSerialNumber: payload.chargePointSerialNumber,
        firmwareVersion: payload.firmwareVersion,
        numberOfConnectors: 4, // Default from simulator
      })
    }

    const response: BootNotificationResponseDto = {
      status: 'Accepted',
      currentTime: new Date().toISOString(),
      interval: 300, // 5 minutes
    }

    this.sendCallResult(client, messageId, response)
    this.logger.log(`Charger ${chargerId} boot notification accepted`)
  }

  private handleAuthorize(
    chargerId: string,
    messageId: string,
    payload: AuthorizeRequestDto,
    client: OCPPWebSocket,
  ) {
    const idTagInfo = this.authService.authorize(payload.idTag)
    const response: AuthorizeResponseDto = {
      idTagInfo,
    }

    this.sendCallResult(client, messageId, response)
  }

  private handleStartTransaction(
    chargerId: string,
    messageId: string,
    payload: StartTransactionRequestDto,
    client: OCPPWebSocket,
  ) {
    // Check authorization
    const idTagInfo = this.authService.authorize(payload.idTag)
    if (idTagInfo.status !== 'Accepted') {
      const response: StartTransactionResponseDto = {
        transactionId: 0,
        idTagInfo,
      }
      this.sendCallResult(client, messageId, response)
      return
    }

    // Create transaction
    const transaction = this.transactionService.createTransaction({
      chargerId,
      connectorId: payload.connectorId,
      idTag: payload.idTag,
      meterStart: payload.meterStart,
    })

    const response: StartTransactionResponseDto = {
      transactionId: transaction.id,
      idTagInfo: {
        status: 'Accepted',
      },
    }

    this.sendCallResult(client, messageId, response)
    this.logger.log(
      `Transaction ${transaction.id} started on charger ${chargerId} connector ${payload.connectorId}`,
    )
  }

  private handleStopTransaction(
    chargerId: string,
    messageId: string,
    payload: StopTransactionRequestDto,
    client: OCPPWebSocket,
  ) {
    const transaction = this.transactionService.stopTransaction(
      payload.transactionId,
      parseFloat(payload.meterStop),
      payload.reason,
    )

    const response: StopTransactionResponseDto = {
      idTagInfo: {
        status: 'Accepted',
      },
    }

    this.sendCallResult(client, messageId, response)
    if (transaction) {
      this.logger.log(
        `Transaction ${payload.transactionId} stopped. Energy: ${transaction.energyConsumed?.toFixed(2)} kWh`,
      )
    }
  }

  private handleStatusNotification(
    chargerId: string,
    messageId: string,
    payload: StatusNotificationRequestDto,
    client: OCPPWebSocket,
  ) {
    this.chargerService.updateConnectorStatus(
      chargerId,
      payload.connectorId,
      payload.status as any,
      payload.errorCode as any,
      payload.info,
    )

    // StatusNotification has empty response
    this.sendCallResult(client, messageId, {})
  }

  private handleMeterValues(
    chargerId: string,
    messageId: string,
    payload: MeterValuesRequestDto,
    client: OCPPWebSocket,
  ) {
    if (payload.transactionId) {
      // Store meter values
      payload.meterValue.forEach((mv) => {
        this.transactionService.addMeterValue({
          transactionId: payload.transactionId!,
          timestamp: new Date(mv.timestamp),
          connectorId: payload.connectorId,
          sampledValues: mv.sampledValue.map((sv) => ({
            value: sv.value,
            measurand: sv.measurand || '',
            unit: sv.unit,
            context: sv.context,
          })),
        })
      })
    }

    // MeterValues has empty response
    this.sendCallResult(client, messageId, {})
  }

  private handleHeartbeat(
    chargerId: string,
    messageId: string,
    payload: any,
    client: OCPPWebSocket,
  ) {
    this.chargerService.updateLastHeartbeat(chargerId)

    const response: HeartbeatResponseDto = {
      currentTime: new Date().toISOString(),
    }

    this.sendCallResult(client, messageId, response)
  }

  private sendCallResult(client: WebSocket, messageId: string, payload: any) {
    if (client.readyState === WebSocket.OPEN) {
      const message = [OCPPMessageType.CALLRESULT, messageId, payload]
      client.send(JSON.stringify(message))
    } else {
      this.logger.warn(
        `Cannot send message, socket not open. State: ${client.readyState}`,
      )
    }
  }

  private sendError(
    client: WebSocket,
    messageId: string,
    errorCode: OCPPErrorCode,
    errorDescription: string,
  ) {
    if (client.readyState === WebSocket.OPEN) {
      const message = [
        OCPPMessageType.CALLERROR,
        messageId,
        {
          errorCode,
          errorDescription,
        },
      ]
      client.send(JSON.stringify(message))
    }
  }

  private handleCallResult(messageId: string, payload: any) {
    const callback = this.pendingCallbacks.get(messageId)
    if (callback) {
      callback(payload)
      this.pendingCallbacks.delete(messageId)
    }
  }

  private handleCallError(messageId: string, payload: any) {
    const callback = this.pendingCallbacks.get(messageId)
    if (callback) {
      callback({ error: payload })
      this.pendingCallbacks.delete(messageId)
    }
  }

  // Send command to charger
  sendCommand(
    chargerId: string,
    action: OCPPAction,
    payload: any,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = this.chargerSockets.get(chargerId)
      if (!client || client.readyState !== WebSocket.OPEN) {
        reject(new Error(`Charger ${chargerId} not connected`))
        return
      }

      const messageId = uuidv4()
      // OCPP 1.6J format: [MessageType, MessageId, ActionName, Payload]
      const message = [OCPPMessageType.CALL, messageId, action, payload]

      this.pendingCallbacks.set(messageId, (response) => {
        if (response.error) {
          reject(response.error)
        } else {
          resolve(response)
        }
      })

      try {
        client.send(JSON.stringify(message))
        this.logger.debug(`Sent ${action} command to charger ${chargerId}`)
      } catch (error) {
        this.pendingCallbacks.delete(messageId)
        reject(error)
      }
    })
  }
}
