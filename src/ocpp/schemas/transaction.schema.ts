import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({ timestamps: true })
export class SampledValue {
  @Prop({ required: true })
  value: string

  @Prop()
  measurand?: string

  @Prop()
  unit?: string

  @Prop()
  context?: string
}

const SampledValueSchema = SchemaFactory.createForClass(SampledValue)

@Schema({ timestamps: true })
export class MeterValue {
  @Prop({ required: true, index: true })
  transactionId: number

  @Prop({ required: true })
  timestamp: Date

  @Prop({ required: true })
  connectorId: number

  @Prop({ type: [SampledValueSchema], default: [] })
  sampledValues: SampledValue[]
}

export const MeterValueSchema = SchemaFactory.createForClass(MeterValue)

export type MeterValueDocument = MeterValue & Document

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true, unique: true, index: true })
  id: number

  @Prop({ required: true, index: true })
  chargerId: string

  @Prop({ required: true, index: true })
  connectorId: number

  @Prop({ required: true })
  idTag: string

  @Prop({ required: true })
  meterStart: number

  @Prop()
  meterStop?: number

  @Prop({ required: true })
  startTime: Date

  @Prop()
  stopTime?: Date

  @Prop({
    enum: [
      'DeAuthorized',
      'EmergencyStop',
      'EVDisconnected',
      'HardReset',
      'Local',
      'Other',
      'PowerLoss',
      'Reboot',
      'Remote',
      'SoftReset',
      'UnlockCommand',
    ],
  })
  stopReason?: string

  @Prop({
    required: true,
    enum: ['active', 'completed', 'stopped'],
    default: 'active',
    index: true,
  })
  status: 'active' | 'completed' | 'stopped'

  @Prop()
  energyConsumed?: number // in kWh
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction)

export type TransactionDocument = Transaction & Document

// Indexes for performance
TransactionSchema.index({ chargerId: 1, connectorId: 1, status: 1 })
TransactionSchema.index({ chargerId: 1, status: 1 })
TransactionSchema.index({ id: 1 })
TransactionSchema.index({ startTime: -1 })

// Indexes for MeterValue
MeterValueSchema.index({ transactionId: 1, timestamp: 1 })

