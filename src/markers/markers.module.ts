import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MarkersController } from './markers.controller'
import { MarkersService } from './markers.service'
import { Marker, MarkerSchema } from './schemas/marker.schema'
import { Charger, ChargerSchema } from '../ocpp/schemas/charger.schema'
import { Connector, ConnectorSchema } from 'src/ocpp/schemas/connector.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Marker.name, schema: MarkerSchema },
      { name: Charger.name, schema: ChargerSchema },
      { name: Connector.name, schema: ConnectorSchema },
    ]),
  ],
  controllers: [MarkersController],
  providers: [MarkersService],
  exports: [MarkersService],
})
export class MarkersModule {}
