import { Module } from '@nestjs/common'
import { OCPPGateway } from './gateway/ocpp.gateway'
import { ChargerService } from './services/charger.service'
import { TransactionService } from './services/transaction.service'
import { AuthService } from './services/auth.service'
import { ChargersController } from './controllers/chargers.controller'
import { TransactionsController } from './controllers/transactions.controller'
import { HealthController } from './controllers/health.controller'

@Module({
  providers: [OCPPGateway, ChargerService, TransactionService, AuthService],
  controllers: [ChargersController, TransactionsController, HealthController],
  exports: [ChargerService, TransactionService, AuthService, OCPPGateway],
})
export class OCPPModule {}
