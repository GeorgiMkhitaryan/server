import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Charger, ChargerDocument } from '../schemas/charger.schema'
import { Connector, ConnectorDocument } from '../schemas/connector.schema'
import { StatusNotificationRequestDto } from '../dto/status-notification.dto'

@Injectable()
export class ConnectorService {
  private readonly logger = new Logger(ConnectorService.name)
  private readonly processingLocks: Map<number, Promise<void>> = new Map()

  constructor(
    @InjectModel(Charger.name) private chargerModel: Model<ChargerDocument>,
    @InjectModel(Connector.name)
    private connectorModel: Model<ConnectorDocument>,
  ) {}

  async addConnector(
    chargerId: string,
    connector: StatusNotificationRequestDto,
  ): Promise<void> {
    try {
      this.updateConnector(chargerId, connector)
    } catch (e: any) {
      this.logger.error(
        `Error adding/updating connector ${connector.connectorId} for charger ${chargerId}: ${e.message}`,
        e.stack,
      )
      throw e
    }
  }

  private async updateConnector(
    chargerId: string,
    connector: StatusNotificationRequestDto,
  ): Promise<void> {
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
    } catch (error) {
      this.logger.error(
        `Error updating connector ${connector.connectorId} for charger ${chargerId}: ${error.message}`,
        error.stack,
      )
      throw error
    }

    // try {

    //   const charger = await this.chargerModel.findOne({ id: chargerId }).populate('connectors')

    //   if (!charger) {
    //     this.logger.error(`Charger ${chargerId} not found`)
    //     throw new Error(`Charger ${chargerId} not found`)
    //   }
    //   const connectorList = charger.connectors

    //   const existingConnector = await this.connectorModel.findOne({
    //     connectorId: connector.connectorId,
    //   })

    //   if (existingConnector) {
    //     existingConnector.status = connector.status
    //     existingConnector.errorCode = connector.errorCode
    //     existingConnector.lastStatusUpdate = new Date()
    //     await existingConnector.save()

    //     this.logger.debug(
    //       `Connector ${connector.connectorId} updated for Charger ${chargerId}`,
    //     )
    //     return
    //   }

    //   const newConnector = await this.connectorModel.create({
    //     chargerId: charger._id,
    //     connectorId: connector.connectorId,
    //     status: connector.status,
    //     errorCode: connector.errorCode,
    //     lastStatusUpdate: new Date(),
    //   })

    //   charger.connectors.push(newConnector._id)
    //   await charger.save()

    //   this.logger.log(
    //     `Connector ${connector.connectorId} added to Charger ${chargerId}`,
    //   )
    // } catch (error) {
    //   this.logger.error(
    //     `Error processing connector ${connector.connectorId} for charger ${chargerId}: ${error.message}`,
    //     error.stack,
    //   )
    //   throw error
    // }
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
