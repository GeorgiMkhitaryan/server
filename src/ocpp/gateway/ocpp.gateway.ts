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
import { ConnectorService } from '../services/connector.service'

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
    private connectorService: ConnectorService,
    private transactionService: TransactionService,
    private authService: AuthService,
  ) {}

  onModuleInit() {
    this.logger.log('OCPP Gateway module initialized')
  }

  initializeWebSocketServer(httpServer: Server) {
    try {
      this.wss = new WebSocket.Server({
        noServer: true,
        perMessageDeflate: false,
        clientTracking: true,
      })

      httpServer.on('upgrade', (request: any, socket: any, head: Buffer) => {
        const url = request.url || ''
        // Only handle /ocpp path
        if (url.startsWith('/ocpp')) {
          this.logger.debug(`Handling OCPP WebSocket upgrade: ${url}`)

          this.wss!.handleUpgrade(
            request,
            socket,
            head,
            (ws: WebSocket.WebSocket) => {
              this.wss!.emit('connection', ws, request)
            },
          )
        }
        // Let other WebSocket servers handle their paths
      })

      this.wss.on('connection', this.handleConnection.bind(this))

      this.wss.on('error', (error) => {
        this.logger.error(
          `WebSocket server error: ${error.message}`,
          error.stack,
        )
      })

      this.logger.log('WebSocket server initialized successfully')
      this.logger.log('  Endpoint: /ocpp/{chargePointId}')
      this.logger.log('  Protocol: OCPP 1.6J (JSON over WebSocket)')
      this.logger.log('  Contract: chargePointId required in path')
    } catch (error) {
      this.logger.error(
        `Failed to initialize WebSocket server: ${error.message}`,
        error.stack,
      )
      throw error
    }
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

  private async handleConnection(client: OCPPWebSocket, request: any) {
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

      if (!chargerId && parsedUrl.query && parsedUrl.query.chargerId) {
        chargerId = parsedUrl.query.chargerId as string
      }

      if (!chargerId && request.headers) {
        chargerId = (request.headers['x-charger-id'] as string) || null
      }

      if (!chargerId) {
        this.logger.error(
          `Connection rejected: chargePointId required in path /ocpp/{chargePointId}`,
        )
        client.close(1008, 'chargePointId required in path')
        return
      }

      if (parsedUrl.auth) {
        const [username] = parsedUrl.auth.split(':')
        this.logger.debug(`Connection with auth user: ${username}***`)
      }

      this.logger.debug(
        `Setting chargerId ${chargerId} for WebSocket connection`,
      )
      client.chargerId = chargerId
      this.chargerSockets.set(chargerId, client)
      const existCharger = await this.chargerService.getCharger(chargerId)
      if (!existCharger) {
        await this.chargerService.createCharger(chargerId)
      } else {
        await this.chargerService.updateChargerStatus(chargerId, 'online')
      }

      this.logger.log(`Charger ${chargerId} connected`)
      client.on('pong', () => {
        client.isAlive = true
      })

      // Handle incoming messages
      client.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data, client)
      })

      client.on('error', (error) => {
        this.logger.error(
          `WebSocket error for charger ${chargerId}: ${error.message}`,
        )
      })

      client.on('close', async () => {
        await this.handleDisconnect(client)
      })
    } catch (error) {
      this.logger.error(
        `Error handling connection: ${error.message}`,
        error.stack,
      )
      client.close(1006, 'Connection error')
    }
  }

  private async handleDisconnect(client: OCPPWebSocket) {
    const chargerId = client.chargerId
    if (chargerId) {
      this.chargerSockets.delete(chargerId)
      await this.chargerService.unregisterConnection(chargerId)
      this.logger.log(`Charger ${chargerId} disconnected`)
      const activeTransactions =
        await this.transactionService.getActiveTransactionsByCharger(chargerId)
      if (activeTransactions.length > 0) {
        this.logger.log(
          `Charger ${chargerId} disconnected with ${activeTransactions.length} active transaction(s) - will resume on reconnect`,
        )
      }
    }
  }

  private async handleMessage(data: WebSocket.Data, client: OCPPWebSocket) {
    try {
      const chargerId = client.chargerId
      if (!chargerId) {
        this.logger.error('Charger ID not found for socket')
        return
      }

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
      this.logger.debug(
        `Received OCPP message from charger ${chargerId}: ${JSON.stringify(message)}`,
      )
      if (!Array.isArray(message) || message.length < 3) {
        this.logger.error(
          `Invalid OCPP message format from charger ${chargerId}`,
        )
        return
      }

      const messageType = message[0]
      const messageId = message[1]
      const action = message[2] as OCPPAction
      const payload = message[3] || {}

      if (messageType === OCPPMessageType.CALL) {
        this.logger.debug(`Received ${action} from charger ${chargerId}`)

        await this.handleIncomingCall(
          chargerId,
          messageId,
          action,
          payload,
          client,
        )
      } else if (messageType === OCPPMessageType.CALLRESULT) {
        // Fixed: Use different variable name to avoid shadowing
        const callResultPayload = message[2]
        this.handleCallResult(messageId, callResultPayload)
      } else if (messageType === OCPPMessageType.CALLERROR) {
        const errorPayload = message[2]
        this.handleCallError(messageId, errorPayload)
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack)
    }
  }

  private readonly handlers: Partial<
    Record<
      OCPPAction,
      (
        chargerId: string,
        messageId: string,
        payload: any,
        client: OCPPWebSocket,
      ) => Promise<void> | void
    >
  > = {
    [OCPPAction.BootNotification]: this.handleBootNotification.bind(this),
    [OCPPAction.Authorize]: this.handleAuthorize.bind(this),
    [OCPPAction.StartTransaction]: this.handleStartTransaction.bind(this),
    [OCPPAction.StopTransaction]: this.handleStopTransaction.bind(this),
    [OCPPAction.StatusNotification]: this.handleStatusNotification.bind(this),
    [OCPPAction.MeterValues]: this.handleMeterValues.bind(this),
    [OCPPAction.Heartbeat]: this.handleHeartbeat.bind(this),
  }

  private async handleIncomingCall(
    chargerId: string,
    messageId: string,
    action: OCPPAction,
    payload: any,
    client: OCPPWebSocket,
  ) {
    const handler = this.handlers[action]
    if (!handler) {
      this.sendError(
        client,
        messageId,
        OCPPErrorCode.NotImplemented,
        `Action ${action} not implemented`,
      )
      return
    }
    await handler(chargerId, messageId, payload, client)
  }

  private async handleBootNotification(
    chargerId: string,
    messageId: string,
    payload: BootNotificationRequestDto,
    client: OCPPWebSocket,
  ) {
    this.logger.debug(
      `BootNotification received from charger ${chargerId}: ${JSON.stringify(payload)}`,
    )

    try {
      const charger = await this.chargerService.getCharger(chargerId)
      const isReconnect = !!charger

      if (!isReconnect) {
        await this.chargerService.createCharger(chargerId)
        this.logger.log(`Charger ${chargerId} created`)
      } else {
        const activeTransactions =
          await this.transactionService.getActiveTransactionsByCharger(
            chargerId,
          )
        if (activeTransactions.length > 0) {
          this.logger.log(
            `Charger ${chargerId} has ${activeTransactions.length} active transaction(s)`,
          )
        }
        this.logger.log(
          `Charger ${chargerId} reconnected with ${charger.connectors?.length || 0} connector(s)`,
        )
      }
      await this.chargerService.addConfigurations({
        id: chargerId,
        ...payload,
      })

      const response: BootNotificationResponseDto = {
        status: 'Accepted',
        currentTime: new Date().toISOString(),
        interval: 300, // 5 minutes
      }

      this.sendCallResult(client, messageId, response)
      this.logger.log(`Charger ${chargerId} boot notification accepted`)
    } catch (error) {
      this.logger.error(
        `Error handling BootNotification: ${error.message}`,
        error.stack,
      )
      this.sendError(
        client,
        messageId,
        OCPPErrorCode.InternalError,
        'Failed to process BootNotification',
      )
    }
  }

  private async handleAuthorize(
    chargerId: string,
    messageId: string,
    payload: AuthorizeRequestDto,
    client: OCPPWebSocket,
  ) {
    try {
      this.logger.debug(
        `Handling Authorize request from charger ${chargerId} for idTag: ${payload?.idTag}`,
      )

      if (!payload || !payload.idTag) {
        this.logger.error(
          `Invalid Authorize payload from charger ${chargerId}: ${JSON.stringify(payload)}`,
        )
        this.sendError(
          client,
          messageId,
          OCPPErrorCode.FormationViolation,
          'idTag is required',
        )
        return
      }

      const idTagInfo = this.authService.authorize(payload.idTag)
      const response: AuthorizeResponseDto = {
        idTagInfo,
      }

      this.sendCallResult(client, messageId, response)
      this.logger.debug(
        `Authorize response sent for charger ${chargerId}, idTag: ${payload.idTag}, status: ${idTagInfo.status}`,
      )
    } catch (error) {
      this.logger.error(
        `Error handling Authorize: ${error.message}`,
        error.stack,
      )
      this.sendError(
        client,
        messageId,
        OCPPErrorCode.InternalError,
        'Failed to process Authorize request',
      )
    }
  }

  private async handleStartTransaction(
    chargerId: string,
    messageId: string,
    payload: StartTransactionRequestDto,
    client: OCPPWebSocket,
  ) {
    try {
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
      const transaction = await this.transactionService.createTransaction({
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
    } catch (error) {
      this.logger.error(
        `Error handling StartTransaction: ${error.message}`,
        error.stack,
      )
      this.sendError(
        client,
        messageId,
        OCPPErrorCode.InternalError,
        'Failed to start transaction',
      )
    }
  }

  private async handleStopTransaction(
    chargerId: string,
    messageId: string,
    payload: StopTransactionRequestDto,
    client: OCPPWebSocket,
  ) {
    try {
      const transaction = await this.transactionService.stopTransaction(
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
    } catch (error) {
      this.logger.error(
        `Error handling StopTransaction: ${error.message}`,
        error.stack,
      )
      this.sendError(
        client,
        messageId,
        OCPPErrorCode.InternalError,
        'Failed to stop transaction',
      )
    }
  }

  private async handleStatusNotification(
    chargerId: string,
    messageId: string,
    payload: StatusNotificationRequestDto,
    client: OCPPWebSocket,
  ) {
    this.logger.debug(
      `StatusNotification received from charger ${chargerId}: ${JSON.stringify(payload)}`,
    )
    await this.connectorService.addConnector(chargerId, payload)
    this.chargerService.sendClientMessage(chargerId, {
      type: 'status-notification',
      payload,
    })
    try {
      this.sendCallResult(client, messageId, {})
    } catch (error) {
      this.logger.error(
        `Error handling StatusNotification: ${error.message}`,
        error.stack,
      )
      this.sendError(
        client,
        messageId,
        OCPPErrorCode.InternalError,
        'Failed to update connector status',
      )
    }
  }

  private async handleMeterValues(
    chargerId: string,
    messageId: string,
    payload: MeterValuesRequestDto,
    client: OCPPWebSocket,
  ) {
    try {
      if (payload.transactionId) {
        // Store meter values
        for (const mv of payload.meterValue) {
          await this.transactionService.addMeterValue({
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
        }
      }

      // MeterValues has empty response
      this.sendCallResult(client, messageId, {})
    } catch (error) {
      this.logger.error(
        `Error handling MeterValues: ${error.message}`,
        error.stack,
      )
      this.sendError(
        client,
        messageId,
        OCPPErrorCode.InternalError,
        'Failed to store meter values',
      )
    }
  }

  private async handleHeartbeat(
    chargerId: string,
    messageId: string,
    payload: any,
    client: OCPPWebSocket,
  ) {
    try {
      await this.chargerService.updateLastHeartbeat(chargerId)

      const response: HeartbeatResponseDto = {
        currentTime: new Date().toISOString(),
      }

      this.sendCallResult(client, messageId, response)
    } catch (error) {
      this.logger.error(
        `Error handling Heartbeat: ${error.message}`,
        error.stack,
      )
      this.sendError(
        client,
        messageId,
        OCPPErrorCode.InternalError,
        'Failed to update heartbeat',
      )
    }
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

  private handleCallResult(messageId: string, payload: Record<string, any>) {
    const callback = this.pendingCallbacks.get(messageId)
    if (callback) {
      callback(payload)
      this.pendingCallbacks.delete(messageId)
    } else {
      this.logger.warn(`No callback found for message ID: ${messageId}`)
    }
  }

  private handleCallError(messageId: string, payload: Record<string, any>) {
    const callback = this.pendingCallbacks.get(messageId)
    if (callback) {
      callback({ error: payload })
      this.pendingCallbacks.delete(messageId)
    } else {
      this.logger.warn(`No callback found for error message ID: ${messageId}`)
    }
  }

  // Send command to charger
  sendCommand(
    chargerId: string,
    action: OCPPAction,
    payload: Record<string, any>,
    timeout: number = 30000, // 30 seconds default timeout
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = this.chargerSockets.get(chargerId)
      if (!client || client.readyState !== WebSocket.OPEN) {
        reject(new Error(`Charger ${chargerId} not connected`))
        return
      }

      const messageId = uuidv4()
      const message = [OCPPMessageType.CALL, messageId, action, payload]

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingCallbacks.delete(messageId)
        reject(
          new Error(
            `Command ${action} to charger ${chargerId} timed out after ${timeout}ms`,
          ),
        )
      }, timeout)

      this.pendingCallbacks.set(messageId, (response) => {
        clearTimeout(timeoutId)
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
        clearTimeout(timeoutId)
        this.pendingCallbacks.delete(messageId)
        reject(error)
      }
    })
  }
}
