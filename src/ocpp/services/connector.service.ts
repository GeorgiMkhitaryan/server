import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Charger, ChargerDocument } from '../schemas/charger.schema'
import { Connector, ConnectorDocument } from '../schemas/connector.schema'

@Injectable()
export class ConnectorService {
  private readonly logger = new Logger(ConnectorService.name)
  private stake: { [key: string]: boolean } = {}

  constructor(
    @InjectModel(Charger.name) private chargerModel: Model<ChargerDocument>,
    @InjectModel(Connector.name)
    private connectorModel: Model<ConnectorDocument>,
  ) {}

  async addConnector(id, connector) {
    if (this.stake[connector.connectorId]) {
      this.logger.log(
        `Connector ${connector.connectorId} is already being processed for Charger ${id}`,
      )
      return
    }
    this.stake[connector.connectorId] = true
    const existingConnector = await this.connectorModel.findOne({
      connectorId: connector.connectorId,
    })
    if (existingConnector) {
      existingConnector.status = connector.status
      existingConnector.errorCode = connector.errorCode
      await existingConnector.save()
      this.stake[connector.connectorId] = false

      this.logger.log(
        `Connector ${connector.connectorId} already exists for Charger ${id}`,
      )
      return
    } else {
      const charger = await this.chargerModel.findOne({
        id,
      })
      const newConnector = await this.connectorModel.create({
        chargerId: charger._id,
        connectorId: connector.connectorId,
        status: connector.status,
        errorCode: connector.errorCode,
      })
      this.stake[connector.connectorId] = false
      charger.connectors.push(newConnector._id)
      await charger.save()
      this.logger.log(
        `Connector ${connector.connectorId} added to Charger ${id}`,
      )
    }
  }
}
