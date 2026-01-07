import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { OCPPModule } from './ocpp/ocpp.module'
import { WsModule } from './wsClient/wsClient.module'

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/ocpp',
      {
        retryWrites: true,
        w: 'majority',
        retryReads: true,
      },
    ),
    OCPPModule,
    WsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
