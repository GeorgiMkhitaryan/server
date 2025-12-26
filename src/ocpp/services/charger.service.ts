import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Charger, ChargerDocument, Connector } from '../schemas/charger.schema'
import {
  ChargerConnection,
  ChargerConnectionDocument,
} from '../schemas/connection.schema'
import { ConnectorStatus, OCPPErrorCode } from '../dto/status-notification.dto'
import { OCPP_CONSTANTS } from '../constants/ocpp.constants'

@Injectable()
export class ChargerService {
  private readonly logger = new Logger(ChargerService.name)

  constructor(
    @InjectModel(Charger.name) private chargerModel: Model<ChargerDocument>,
    @InjectModel(ChargerConnection.name)
    private connectionModel: Model<ChargerConnectionDocument>,
  ) {}

  async createCharger(id): Promise<Charger> {
    const charger = new this.chargerModel({
      id: id,
      status: 'offline',
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
    const update: any = { status, updatedAt: new Date() }
    if (status === 'online') {
      update.lastHeartbeat = new Date()
    }
    await this.chargerModel.updateOne({ id }, { $set: update })
  }

  async updateConnectorStatus(
    chargerId: string,
    connectorId: number,
    status: ConnectorStatus,
    errorCode: OCPPErrorCode,
    info?: string,
  ): Promise<void> {
    const charger = await this.chargerModel.findOne({ id: chargerId })
    if (charger) {
      const connector = charger.connectors.find((c) => c.id === connectorId)
      if (connector) {
        const previousStatus = connector.status
        connector.status = status
        connector.errorCode = errorCode
        connector.info = info
        connector.lastStatusUpdate = new Date()

        await charger.save()

        this.logger.log(
          `Charger ${chargerId} connector ${connectorId}: ${previousStatus} → ${status}`,
        )

        if (
          previousStatus === ConnectorStatus.Faulted &&
          status === ConnectorStatus.Available
        ) {
          this.logger.log(
            `Charger ${chargerId} connector ${connectorId} recovered from fault`,
          )
        }
      }
    }
  }

  async updateLastHeartbeat(chargerId: string): Promise<void> {
    await this.chargerModel.updateOne(
      { id: chargerId },
      {
        $set: {
          lastHeartbeat: new Date(),
          status: 'online',
          updatedAt: new Date(),
        },
      },
    )
  }

  async registerConnection({ id, ...data }): Promise<void> {
    // Get existing charger to preserve connector count if reconnecting
    const existingCharger = await this.chargerModel.findOne({ id })
    console.log(data, 'data')

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
