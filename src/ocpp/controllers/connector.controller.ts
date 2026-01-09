import { Body, Controller, Post } from '@nestjs/common';
import { ConnectorService } from '../services/connector.service';
import { ConnectorUpdateRequestDto } from '../dto/status-notification.dto';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Connector } from '../schemas/connector.schema';

@Controller('connector')
export class ConnectorController {
  constructor(private connectorService: ConnectorService) {}
  @Post('update')
  @ApiBody({ type: ConnectorUpdateRequestDto })
  @ApiOkResponse({ description: 'Connector created', type: Connector })
  async getHealth(@Body() payload: ConnectorUpdateRequestDto) {
    return await this.connectorService.adminUpdateConnector(payload);
  }
}

