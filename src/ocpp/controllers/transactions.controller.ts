import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { TransactionService } from '../services/transaction.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  getAllTransactions(@Query('chargerId') chargerId?: string) {
    if (chargerId) {
      return this.transactionService.getTransactionsByCharger(chargerId);
    }
    return this.transactionService.getAllTransactions();
  }

  @Get(':transactionId')
  getTransaction(@Param('transactionId') transactionId: number) {
    const transaction = this.transactionService.getTransaction(transactionId);
    if (!transaction) {
      throw new NotFoundException(
        `Transaction ${transactionId} not found`,
      );
    }

    const meterValues = this.transactionService.getMeterValues(transactionId);

    return {
      ...transaction,
      meterValues,
    };
  }
}

