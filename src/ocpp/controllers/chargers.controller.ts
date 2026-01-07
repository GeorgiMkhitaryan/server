import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { ChargerService } from '../services/charger.service'
import { ConnectorService } from '../services/connector.service'
import { TransactionService } from '../services/transaction.service'
import { OCPPGateway } from '../gateway/ocpp.gateway'
import { OCPPAction } from '../interfaces/ocpp-message.interface'
import { AuthGuard } from '../Guards/AuthGuard'
import {
  RemoteStartTransactionDto,
  ResetChargerDto,
} from '../dto/remote-start-transaction.dto'

@UseGuards(AuthGuard)
@Controller('chargers')
export class ChargersController {
  constructor(
    private chargerService: ChargerService,
    private connectorService: ConnectorService,
    private transactionService: TransactionService,
    private ocppGateway: OCPPGateway,
  ) {}

  @Get()
  async getAllChargers() {
    return this.chargerService.getAllChargers()
  }

  @Get(':chargerId')
  async getCharger(@Param('chargerId') chargerId: string) {
    const charger = await this.chargerService.getCharger(chargerId)
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`)
    }
    return charger
  }

  @Get(':chargerId/connectors/:connectorId')
  async getConnector(
    @Param('chargerId') chargerId: string,
    @Param('connectorId', ParseIntPipe) connectorId: number,
  ) {
    const charger = await this.chargerService.getCharger(chargerId)
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`)
    }

    const connector = await this.connectorService.getConnector(
      chargerId,
      connectorId,
    )
    if (!connector) {
      throw new NotFoundException(
        `Connector ${connectorId} not found on charger ${chargerId}`,
      )
    }

    return connector
  }

  @Post(':chargerId/connectors/:connectorId/start')
  async startTransaction(
    @Param('chargerId') chargerId: string,
    @Param('connectorId', ParseIntPipe) connectorId: number,
    @Body() body: RemoteStartTransactionDto,
  ) {
    const charger = await this.chargerService.getCharger(chargerId)
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`)
    }

    try {
      const response = await this.ocppGateway.sendCommand(
        chargerId,
        OCPPAction.RemoteStartTransaction,
        {
          connectorId,
          idTag: body.idTag,
          chargingProfile: body.chargingProfile,
        },
      )

      return {
        success: true,
        message: 'Transaction started',
        response,
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to start transaction: ${error.message}`,
      )
    }
  }

  @Post(':chargerId/connectors/:connectorId/stop')
  async stopTransaction(
    @Param('chargerId') chargerId: string,
    @Param('connectorId', ParseIntPipe) connectorId: number,
  ) {
    const charger = await this.chargerService.getCharger(chargerId)
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`)
    }

    const transaction = await this.transactionService.getActiveTransaction(
      chargerId,
      connectorId,
    )
    if (!transaction) {
      throw new NotFoundException(
        `No active transaction found on connector ${connectorId}`,
      )
    }

    try {
      const response = await this.ocppGateway.sendCommand(
        chargerId,
        OCPPAction.RemoteStopTransaction,
        {
          transactionId: transaction.id,
        },
      )

      return {
        success: true,
        message: 'Transaction stopped',
        response,
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to stop transaction: ${error.message}`,
      )
    }
  }

  @Post(':chargerId/reset')
  async resetCharger(
    @Param('chargerId') chargerId: string,
    @Body() body: ResetChargerDto,
  ) {
    const charger = await this.chargerService.getCharger(chargerId)
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`)
    }

    try {
      const response = await this.ocppGateway.sendCommand(
        chargerId,
        OCPPAction.Reset,
        {
          type: body.type || 'Hard',
        },
      )

      return {
        success: true,
        message: 'Reset command sent',
        response,
      }
    } catch (error) {
      throw new BadRequestException(`Failed to reset charger: ${error.message}`)
    }
  }

  @Post(':chargerId/unlock/:connectorId')
  async unlockConnector(
    @Param('chargerId') chargerId: string,
    @Param('connectorId', ParseIntPipe) connectorId: number,
  ) {
    const charger = await this.chargerService.getCharger(chargerId)
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`)
    }

    try {
      const response = await this.ocppGateway.sendCommand(
        chargerId,
        OCPPAction.UnlockConnector,
        {
          connectorId,
        },
      )

      return {
        success: true,
        message: 'Unlock command sent',
        response,
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to unlock connector: ${error.message}`,
      )
    }
  }
}
