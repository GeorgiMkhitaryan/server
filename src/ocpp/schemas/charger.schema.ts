import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { ConnectorStatus, OCPPErrorCode } from '../dto/status-notification.dto'

export type ChargerDocument = Charger & Document

@Schema({ timestamps: true })
export class Connector {
  @Prop({ required: false })
  id: number

  @Prop({ required: true, enum: Object.values(ConnectorStatus) })
  status: ConnectorStatus

  @Prop({ required: true, enum: Object.values(OCPPErrorCode) })
  errorCode: OCPPErrorCode

  @Prop()
  info?: string

  @Prop()
  lastStatusUpdate?: Date
}

const ConnectorSchema = SchemaFactory.createForClass(Connector)

@Schema({ timestamps: true })
export class Charger {
  @Prop({ required: true, unique: true, index: true })
  id: string
  
  @Prop({ required: true, enum: ['online', 'offline'], default: 'offline' })
  status: 'online' | 'offline'

  @Prop()
  chargePointVendor?: string

  @Prop()
  chargePointModel?: string

  @Prop()
  chargePointSerialNumber?: string

  @Prop()
  chargeBoxSerialNumber?: string

  @Prop()
  firmwareVersion?: string

  @Prop()
  iccid?: string

  @Prop()
  imsi?: string

  @Prop()
  meterSerialNumber?: string

  @Prop()
  meterType?: string

  @Prop()
  lastHeartbeat?: Date

  @Prop({ type: [ConnectorSchema], default: [] })
  connectors: Connector[]

  @Prop({ type: Map, of: String, default: {} })
  configuration?: Record<string, string>
}

export const ChargerSchema = SchemaFactory.createForClass(Charger)

// Indexes for performance
ChargerSchema.index({ id: 1 })
ChargerSchema.index({ status: 1 })
ChargerSchema.index({ lastHeartbeat: 1 })
