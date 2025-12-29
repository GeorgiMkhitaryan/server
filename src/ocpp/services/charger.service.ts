import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Charger, ChargerDocument } from '../schemas/charger.schema'
import { Connector, ConnectorDocument } from '../schemas/connector.schema'
import { ConnectorStatus } from '../dto/status-notification.dto'
import {
  ChargerConnection,
  ChargerConnectionDocument,
} from '../schemas/connection.schema'

@Injectable()
export class ChargerService {
  private readonly logger = new Logger(ChargerService.name)

  constructor(
    @InjectModel(Charger.name) private chargerModel: Model<ChargerDocument>,
    @InjectModel(Connector.name) private connectorModel: Model<ConnectorDocument>,
    @InjectModel(ChargerConnection.name)
    private connectionModel: Model<ChargerConnectionDocument>,
  ) {}

  async createCharger(id): Promise<Charger> {
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
    if (!charger) return

    const update: any = { status, updatedAt: new Date() }
    if (status === 'online') {
      update.lastHeartbeat = new Date()
    }
    await this.chargerModel.updateOne({ id }, { $set: update })

    const connectorStatus = status === 'offline' ? ConnectorStatus.Unavailable : ConnectorStatus.Available
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

  async addConfigurations({ id, ...data }): Promise<void> {
    await this.chargerModel.findOneAndUpdate(
      { id },
      {
        $set: {
          configuration: {
            ...data,
          },
          status: 'online',
          lastHeartbeat: new Date(),
        },
        $setOnInsert: {
          connectedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    )

    this.logger.log(`Charger ${data.id} registered (socket: ${data.socketId})`)
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
}
