import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  Transaction,
  TransactionDocument,
  MeterValue,
  MeterValueDocument,
} from '../schemas/transaction.schema'

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name)
  private nextTransactionId = 1

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(MeterValue.name)
    private meterValueModel: Model<MeterValueDocument>,
  ) {
    this.initializeTransactionId()
  }

  private async initializeTransactionId(): Promise<void> {
    const lastTransaction = await this.transactionModel
      .findOne()
      .sort({ id: -1 })
      .lean()
    if (lastTransaction) {
      this.nextTransactionId = lastTransaction.id + 1
      this.logger.log(
        `Initialized transaction ID counter: ${this.nextTransactionId}`,
      )
    }
  }

  async createTransaction(data: {
    chargerId: string
    connectorId: number
    idTag: string
    meterStart: number
  }): Promise<Transaction> {
    const transactionId = this.nextTransactionId++

    const transaction = new this.transactionModel({
      id: transactionId,
      chargerId: data.chargerId,
      connectorId: data.connectorId,
      idTag: data.idTag,
      meterStart: data.meterStart,
      startTime: new Date(),
      status: 'active',
    })

    await transaction.save()
    this.logger.log(
      `Transaction ${transactionId} started on charger ${data.chargerId} connector ${data.connectorId}`,
    )
    return transaction.toObject()
  }

  async stopTransaction(
    transactionId: number,
    meterStop: number,
    reason?: Transaction['stopReason'],
  ): Promise<Transaction | null> {
    const transaction = await this.transactionModel.findOne({
      id: transactionId,
    })

    if (transaction) {
      transaction.meterStop = meterStop
      transaction.stopTime = new Date()
      transaction.stopReason = reason
      transaction.status = 'completed'

      // Calculate energy consumed
      transaction.energyConsumed = (meterStop - transaction.meterStart) / 1000 // Convert Wh to kWh

      // updatedAt is automatically updated by Mongoose timestamps: true
      await transaction.save()

      this.logger.log(
        `Transaction ${transactionId} stopped. Energy: ${transaction.energyConsumed?.toFixed(2)} kWh`,
      )
      return transaction.toObject()
    }
    return null
  }

  async getTransaction(transactionId: number): Promise<Transaction | null> {
    const transaction = await this.transactionModel
      .findOne({ id: transactionId })
      .lean()
    return transaction
  }

  async getActiveTransaction(
    chargerId: string,
    connectorId: number,
  ): Promise<Transaction | null> {
    const transaction = await this.transactionModel
      .findOne({
        chargerId,
        connectorId,
        status: 'active',
      })
      .lean()
    return transaction
  }

  async getActiveTransactionsByCharger(
    chargerId: string,
  ): Promise<Transaction[]> {
    return this.transactionModel
      .find({
        chargerId,
        status: 'active',
      })
      .lean()
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return this.transactionModel.find().sort({ startTime: -1 }).lean()
  }

  async getTransactionsByCharger(chargerId: string): Promise<Transaction[]> {
    return this.transactionModel
      .find({ chargerId })
      .sort({ startTime: -1 })
      .lean()
  }

  async addMeterValue(meterValue: {
    transactionId: number
    timestamp: Date
    connectorId: number
    sampledValues: {
      value: string
      measurand: string
      unit?: string
      context?: string
    }[]
  }): Promise<void> {
    const mv = new this.meterValueModel(meterValue)
    await mv.save()

    // Update transaction with latest meter value
    const transaction = await this.transactionModel.findOne({
      id: meterValue.transactionId,
    })

    if (transaction && meterValue.sampledValues.length > 0) {
      const energyValue = meterValue.sampledValues.find(
        (sv) => sv.measurand === 'Energy.Active.Import.Register',
      )
      if (energyValue) {
        const energyWh = parseFloat(energyValue.value)
        transaction.energyConsumed = (energyWh - transaction.meterStart) / 1000
        await transaction.save()
      }
    }
  }

  async getMeterValues(transactionId: number): Promise<MeterValue[]> {
    return this.meterValueModel
      .find({ transactionId })
      .sort({ timestamp: 1 })
      .lean()
  }
}
