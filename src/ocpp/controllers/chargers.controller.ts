import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChargerService } from '../services/charger.service';
import { TransactionService } from '../services/transaction.service';
import { OCPPGateway } from '../gateway/ocpp.gateway';
import { OCPPAction } from '../interfaces/ocpp-message.interface';

@Controller('chargers')
export class ChargersController {
  constructor(
    private chargerService: ChargerService,
    private transactionService: TransactionService,
    private ocppGateway: OCPPGateway,
  ) {}

  @Get()
  getAllChargers() {
    return this.chargerService.getAllChargers();
  }

  @Get(':chargerId')
  getCharger(@Param('chargerId') chargerId: string) {
    const charger = this.chargerService.getCharger(chargerId);
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`);
    }
    return charger;
  }

  @Get(':chargerId/connectors/:connectorId')
  getConnector(
    @Param('chargerId') chargerId: string,
    @Param('connectorId') connectorId: number,
  ) {
    const charger = this.chargerService.getCharger(chargerId);
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`);
    }

    const connector = charger.connectors.find((c) => c.id === connectorId);
    if (!connector) {
      throw new NotFoundException(
        `Connector ${connectorId} not found on charger ${chargerId}`,
      );
    }

    return connector;
  }

  @Post(':chargerId/connectors/:connectorId/start')
  async startTransaction(
    @Param('chargerId') chargerId: string,
    @Param('connectorId') connectorId: number,
    @Body() body: { idTag: string; chargingProfile?: any },
  ) {
    const charger = this.chargerService.getCharger(chargerId);
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`);
    }

    if (!body.idTag) {
      throw new BadRequestException('idTag is required');
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
      );

      return {
        success: true,
        message: 'Transaction started',
        response,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to start transaction: ${error.message}`,
      );
    }
  }

  @Post(':chargerId/connectors/:connectorId/stop')
  async stopTransaction(
    @Param('chargerId') chargerId: string,
    @Param('connectorId') connectorId: number,
  ) {
    const charger = this.chargerService.getCharger(chargerId);
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`);
    }

    const transaction = this.transactionService.getActiveTransaction(
      chargerId,
      connectorId,
    );
    if (!transaction) {
      throw new NotFoundException(
        `No active transaction found on connector ${connectorId}`,
      );
    }

    try {
      const response = await this.ocppGateway.sendCommand(
        chargerId,
        OCPPAction.RemoteStopTransaction,
        {
          transactionId: transaction.id,
        },
      );

      return {
        success: true,
        message: 'Transaction stopped',
        response,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to stop transaction: ${error.message}`,
      );
    }
  }

  @Post(':chargerId/reset')
  async resetCharger(
    @Param('chargerId') chargerId: string,
    @Body() body: { type: 'Hard' | 'Soft' },
  ) {
    const charger = this.chargerService.getCharger(chargerId);
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`);
    }

    try {
      const response = await this.ocppGateway.sendCommand(
        chargerId,
        OCPPAction.Reset,
        {
          type: body.type || 'Hard',
        },
      );

      return {
        success: true,
        message: 'Reset command sent',
        response,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to reset charger: ${error.message}`);
    }
  }

  @Post(':chargerId/unlock/:connectorId')
  async unlockConnector(
    @Param('chargerId') chargerId: string,
    @Param('connectorId') connectorId: number,
  ) {
    const charger = this.chargerService.getCharger(chargerId);
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`);
    }

    try {
      const response = await this.ocppGateway.sendCommand(
        chargerId,
        OCPPAction.UnlockConnector,
        {
          connectorId,
        },
      );

      return {
        success: true,
        message: 'Unlock command sent',
        response,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to unlock connector: ${error.message}`,
      );
    }
  }

  @Get(':chargerId/config')
  getConfiguration(@Param('chargerId') chargerId: string) {
    const charger = this.chargerService.getCharger(chargerId);
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`);
    }

    return charger.configuration || {};
  }

  @Post(':chargerId/config')
  async updateConfiguration(
    @Param('chargerId') chargerId: string,
    @Body() body: { key: string; value: string },
  ) {
    const charger = this.chargerService.getCharger(chargerId);
    if (!charger) {
      throw new NotFoundException(`Charger ${chargerId} not found`);
    }

    if (!body.key || body.value === undefined) {
      throw new BadRequestException('key and value are required');
    }

    try {
      const response = await this.ocppGateway.sendCommand(
        chargerId,
        OCPPAction.ChangeConfiguration,
        {
          key: body.key,
          value: body.value,
        },
      );

      if (response.status === 'Accepted') {
        this.chargerService.updateConfiguration(chargerId, body.key, body.value);
      }

      return {
        success: true,
        message: 'Configuration updated',
        response,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to update configuration: ${error.message}`,
      );
    }
  }
}

