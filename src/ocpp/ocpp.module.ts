import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { OCPPGateway } from './gateway/ocpp.gateway'
import { ChargerService } from './services/charger.service'
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Charger.name, schema: ChargerSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: MeterValue.name, schema: MeterValueSchema },
      { name: ChargerConnection.name, schema: ChargerConnectionSchema },
    ]),
  ],
  providers: [OCPPGateway, ChargerService, TransactionService, AuthService],
  controllers: [ChargersController, TransactionsController, HealthController],
  exports: [OCPPGateway, ChargerService, TransactionService, AuthService],
})
export class OCPPModule {}
