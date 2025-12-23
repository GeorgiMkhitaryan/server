import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { OCPPModule } from './ocpp/ocpp.module'

@Module({
  imports: [OCPPModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
