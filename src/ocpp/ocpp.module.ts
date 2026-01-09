import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { OCPPGateway } from './gateway/ocpp.gateway'
import { ChargerService } from './services/charger.service'
import { ConnectorService } from './services/connector.service'
import { TransactionService } from './services/transaction.service'
import { AuthService } from './services/auth.service'
import { ChargersController } from './controllers/chargers.controller'
import { TransactionsController } from './controllers/transactions.controller'
import { HealthController } from './controllers/health.controller'
import { Charger, ChargerSchema } from './schemas/charger.schema'
import {
  Transaction,
  TransactionSchema,
  MeterValue,
  MeterValueSchema,
} from './schemas/transaction.schema'
import {
  ChargerConnection,
  ChargerConnectionSchema,
} from './schemas/connection.schema'
import { Connector, ConnectorSchema } from './schemas/connector.schema'
import { WsModule } from 'src/wsClient/wsClient.module'
import { ConnectorController } from './controllers/connector.controller'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Charger.name, schema: ChargerSchema },
      { name: Connector.name, schema: ConnectorSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: MeterValue.name, schema: MeterValueSchema },
      { name: ChargerConnection.name, schema: ChargerConnectionSchema },
    ]),
    forwardRef(() => WsModule),
  ],
  providers: [
    OCPPGateway,
    ChargerService,
    ConnectorService,
    TransactionService,
    AuthService,
  ],
  controllers: [ChargersController, TransactionsController, HealthController, ConnectorController],
  exports: [
    OCPPGateway,
    ChargerService,
    ConnectorService,
    TransactionService,
    AuthService,
  ],
})
export class OCPPModule {}
