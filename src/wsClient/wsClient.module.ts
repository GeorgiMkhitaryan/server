import { Module, forwardRef } from '@nestjs/common'
import { WsClientGateway } from './ws.client'
import { OCPPModule } from 'src/ocpp/ocpp.module'

@Module({
  imports: [forwardRef(() => OCPPModule)],
  providers: [WsClientGateway],
  exports: [WsClientGateway],
})
export class WsModule {}
