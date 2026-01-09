import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Charger, ChargerDocument } from '../schemas/charger.schema'
import { Connector, ConnectorDocument } from '../schemas/connector.schema'
import {
  ConnectorUpdateRequestDto,
  StatusNotificationRequestDto,
} from '../dto/status-notification.dto'

@Injectable()
export class ConnectorService {
  private readonly logger = new Logger(ConnectorService.name)

  constructor(
    @InjectModel(Charger.name) private chargerModel: Model<ChargerDocument>,
    @InjectModel(Connector.name)
    private connectorModel: Model<ConnectorDocument>,
  ) {}

  async addConnector(
    chargerId: string,
    connector: StatusNotificationRequestDto,
  ): Promise<string> {
    try {
      return this.updateConnector(chargerId, connector)
    } catch (e: any) {
      this.logger.error(
        `Error adding/updating connector ${connector.connectorId} for charger ${chargerId}: ${e.message}`,
        e.stack,
      )
      throw e
    }
  }
  async adminUpdateConnector({
    connectorId,
    ...payload
  }: ConnectorUpdateRequestDto): Promise<Connector | null> {
    try {

      const connector = await this.connectorModel.findOneAndUpdate(
        { _id: connectorId },
        { $set: payload },
        { upsert: true, new: true },
      )
      return connector
    } catch (error) {
      this.logger.error(
        `Error updating connector ${connectorId} for system: ${error.message}`,
        error.stack,
      )
      throw error
    }
  }

  private async updateConnector(
    chargerId: string,
    connector: StatusNotificationRequestDto,
  ): Promise<string> {
    try {
      const charger = await this.chargerModel.findOne({ id: chargerId })
      const connectorDoc = await this.connectorModel.findOneAndUpdate(
        { chargerId: charger._id, connectorId: connector.connectorId },
        {
          $set: {
            status: connector.status,
            errorCode: connector.errorCode,
            lastStatusUpdate: new Date(),
          },
        },
        { upsert: true, new: true },
      )

      await this.chargerModel.updateOne(
        { _id: charger._id },
        { $addToSet: { connectors: connectorDoc._id } },
      )
      return charger._id.toString()
    } catch (error) {
      this.logger.error(
        `Error updating connector ${connector.connectorId} for charger ${chargerId}: ${error.message}`,
        error.stack,
      )
      throw error
    }
  }

  async getConnector(
    chargerId: string,
    connectorId: number,
  ): Promise<Connector | null> {
    try {
      const charger = await this.chargerModel.findOne({ id: chargerId }).lean()
      if (!charger) {
        return null
      }

      const connector = await this.connectorModel
        .findOne({
          chargerId: charger._id,
          connectorId,
        })
        .lean()

      return connector
    } catch (error) {
      this.logger.error(
        `Error getting connector ${connectorId} for charger ${chargerId}: ${error.message}`,
        error.stack,
      )
      throw error
    }
  }
}
