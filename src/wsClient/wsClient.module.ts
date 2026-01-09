import { Module, forwardRef } from '@nestjs/common'
import { WsClientGateway } from './ws.client'
import { OCPPModule } from 'src/ocpp/ocpp.module'
import { MarkersModule } from 'src/markers/markers.module'

@Module({
  imports: [forwardRef(() => OCPPModule), forwardRef(() => MarkersModule)],
  providers: [WsClientGateway],
  exports: [WsClientGateway],
})
export class WsModule {}
