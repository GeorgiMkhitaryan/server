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
    return {
      server: 'running',
      service: 'OCPP Server',
      timestamp: new Date().toISOString(),
      websocket: 'ws://localhost:3000/ocpp',
    }
  }
}
