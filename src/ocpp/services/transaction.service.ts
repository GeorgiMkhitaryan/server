import { Injectable, Logger } from '@nestjs/common';
import { Transaction, MeterValue } from '../interfaces/transaction.interface';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private transactions: Map<number, Transaction> = new Map();
  private meterValues: MeterValue[] = [];
  private nextTransactionId = 1;

  createTransaction(data: {
    chargerId: string;
    connectorId: number;
    idTag: string;
    meterStart: number;
  }): Transaction {
    const transaction: Transaction = {
      id: this.nextTransactionId++,
      chargerId: data.chargerId,
      connectorId: data.connectorId,
      idTag: data.idTag,
      meterStart: data.meterStart,
      startTime: new Date(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.transactions.set(transaction.id, transaction);
    this.logger.log(
      `Transaction ${transaction.id} started on charger ${data.chargerId} connector ${data.connectorId}`,
    );
    return transaction;
  }

  stopTransaction(
    transactionId: number,
    meterStop: number,
    reason?: Transaction['stopReason'],
  ): Transaction | undefined {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.meterStop = meterStop;
      transaction.stopTime = new Date();
      transaction.stopReason = reason;
      transaction.status = 'completed';
      transaction.updatedAt = new Date();

      // Calculate energy consumed
      transaction.energyConsumed =
        (meterStop - transaction.meterStart) / 1000; // Convert Wh to kWh

      this.logger.log(
        `Transaction ${transactionId} stopped. Energy: ${transaction.energyConsumed?.toFixed(2)} kWh`,
      );
      return transaction;
    }
    return undefined;
  }

  getTransaction(transactionId: number): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  getActiveTransaction(
    chargerId: string,
    connectorId: number,
  ): Transaction | undefined {
    return Array.from(this.transactions.values()).find(
      (t) =>
        t.chargerId === chargerId &&
        t.connectorId === connectorId &&
        t.status === 'active',
    );
  }

  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  getTransactionsByCharger(chargerId: string): Transaction[] {
    return Array.from(this.transactions.values()).filter(
      (t) => t.chargerId === chargerId,
    );
  }

  addMeterValue(meterValue: MeterValue): void {
    this.meterValues.push(meterValue);

    // Update transaction with latest meter value
    const transaction = this.transactions.get(meterValue.transactionId);
    if (transaction && meterValue.sampledValues.length > 0) {
      const energyValue = meterValue.sampledValues.find(
        (sv) => sv.measurand === 'Energy.Active.Import.Register',
      );
      if (energyValue) {
        const energyWh = parseFloat(energyValue.value);
        transaction.energyConsumed = (energyWh - transaction.meterStart) / 1000;
        transaction.updatedAt = new Date();
      }
    }
  }

  getMeterValues(transactionId: number): MeterValue[] {
    return this.meterValues.filter((mv) => mv.transactionId === transactionId);
  }
}

