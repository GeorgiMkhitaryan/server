import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Query,
  ParseIntPipe,
} from '@nestjs/common'
import { TransactionService } from '../services/transaction.service'

@Controller('transactions')
export class TransactionsController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  async getAllTransactions(@Query('chargerId') chargerId?: string) {
    if (chargerId) {
      return this.transactionService.getTransactionsByCharger(chargerId)
    }
    return this.transactionService.getAllTransactions()
  }

  @Get(':transactionId')
  async getTransaction(
    @Param('transactionId', ParseIntPipe) transactionId: number,
  ) {
    const transaction = await this.transactionService.getTransaction(transactionId)
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`)
    }

    const meterValues = await this.transactionService.getMeterValues(transactionId)

    return {
      ...transaction,
      meterValues,
    }
  }
}

