import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Charger, ChargerDocument } from '../schemas/charger.schema'
import { Connector, ConnectorDocument } from '../schemas/connector.schema'
import { ConnectorStatus } from '../dto/status-notification.dto'
import {
  ChargerConnection,
  ChargerConnectionDocument,
} from '../schemas/connection.schema'
import { WsClientGateway } from 'src/wsClient/ws.client'

@Injectable()
export class ChargerService {
  private readonly logger = new Logger(ChargerService.name)

  constructor(
    @Inject(forwardRef(() => WsClientGateway))
    private wsClient: WsClientGateway,
    @InjectModel(Charger.name) private chargerModel: Model<ChargerDocument>,
    @InjectModel(Connector.name)
    private connectorModel: Model<ConnectorDocument>,
    @InjectModel(ChargerConnection.name)
    private connectionModel: Model<ChargerConnectionDocument>,
  ) {}

  async createCharger(id: string): Promise<Charger> {
    const charger = new this.chargerModel({
      id: id,
      status: 'online',
      lastHeartbeat: new Date(),
      configuration: {},
    })

    await charger.save()
    this.logger.log(`Charger ${id} created`)
    return charger.toObject()
  }

  async getCharger(id: string): Promise<Charger | null> {
    const charger = await this.chargerModel.findOne({ id }).lean()
    return charger
  }

  async getAllChargers(): Promise<Charger[]> {
    return this.chargerModel.find().lean()
  }

  async updateChargerStatus(
    id: string,
    status: 'online' | 'offline',
  ): Promise<void> {
    const charger = await this.chargerModel.findOne({ id })
    if (!charger) {
      this.logger.warn(`Charger ${id} not found when updating status`)
      return
    }

    const update: Partial<Charger> & {
      updatedAt?: Date
      lastHeartbeat?: Date
    } = {
      status,
      updatedAt: new Date(),
    }
    if (status === 'online') {
      update.lastHeartbeat = new Date()
    }
    await this.chargerModel.updateOne({ id }, { $set: update })

    const connectorStatus =
      status === 'offline'
        ? ConnectorStatus.Unavailable
        : ConnectorStatus.Available
    await this.connectorModel.updateMany(
      { chargerId: charger._id },
      { $set: { status: connectorStatus, lastStatusUpdate: new Date() } },
    )
  }

  async updateLastHeartbeat(chargerId: string): Promise<void> {
    await this.chargerModel.updateOne(
      { id: chargerId },
      {
        $set: {
          lastHeartbeat: new Date(),
          status: 'online',
        },
      },
    )
  }

  async addConfigurations({
    id,
    ...data
  }: {
    id: string
    chargePointVendor?: string
    chargePointModel?: string
    chargePointSerialNumber?: string
    chargeBoxSerialNumber?: string
    firmwareVersion?: string
    iccid?: string
    imsi?: string
    meterSerialNumber?: string
    meterType?: string
    socketId?: string
    [key: string]: any
  }): Promise<void> {
    try {
      await this.chargerModel.findOneAndUpdate(
        { id },
        {
          $set: {
            configuration: data,
            status: 'online',
            lastHeartbeat: new Date(),
          },
          $setOnInsert: {
            connectedAt: new Date(),
          },
        },
        { upsert: true, new: true },
      )

      this.logger.log(
        `Charger ${id} registered${data.socketId ? ` (socket: ${data.socketId})` : ''}`,
      )
    } catch (error) {
      this.logger.error(
        `Error adding configurations for charger ${id}: ${error.message}`,
        error.stack,
      )
      throw error
    }
  }

  async unregisterConnection(chargerId: string): Promise<void> {
    await this.connectionModel.deleteOne({ chargerId })
    await this.updateChargerStatus(chargerId, 'offline')
    this.logger.log(`Charger ${chargerId} disconnected`)
  }

  async getConnection(chargerId: string): Promise<ChargerConnection | null> {
    const connection = await this.connectionModel.findOne({ chargerId }).lean()
    return connection
  }

  async getSocketId(chargerId: string): Promise<string | undefined> {
    const connection = await this.connectionModel.findOne({ chargerId }).lean()
    return connection?.socketId
  }

  sendClientMessage(chargerId: string, message: any) {
    this.wsClient.broadcast({
      type: 'charger',
      id: chargerId,
      message: message,
    })
  }
}
