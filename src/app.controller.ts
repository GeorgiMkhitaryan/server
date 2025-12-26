import { Controller, Get } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Get('status')
  getStatus() {
    const port = process.env.PORT || 3000
    const domain = process.env.DOMAIN || 'localhost'
    return {
      server: 'running',
      service: 'OCPP CSMS',
      version: '1.6J',
      timestamp: new Date().toISOString(),
      websocket: `ws://${domain}:${port}/ocpp/{chargePointId}`,
      contract: 'See CONTRACT.md',
    }
  }
}
