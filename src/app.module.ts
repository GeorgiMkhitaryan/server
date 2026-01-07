import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { OCPPModule } from './ocpp/ocpp.module'
import { WsModule } from './wsClient/wsClient.module'
import { UsersModule } from './users/users.module'
import { CarsModule } from './cars/cars.module'

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
    UsersModule,
    CarsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
