import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type ChargerDocument = Charger & Document
@Schema({ timestamps: true })
export class Charger {
  @Prop({ required: true, unique: true, index: true })
  id: string
  
  @Prop({ required: true, enum: ['online', 'offline'], default: 'offline' })
  status: 'online' | 'offline'

  @Prop()
  lastHeartbeat?: Date

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Connector' }], default: [] })
  connectors: Types.ObjectId[]

  @Prop({ type: Object, default: {} })
  configuration?: {
    chargePointVendor?: string
    chargePointModel?: string
    chargePointSerialNumber?: string
    chargeBoxSerialNumber?: string
    firmwareVersion?: string
    iccid?: string
    imsi?: string
    meterSerialNumber?: string
    meterType?: string
  }
}


export const ChargerSchema = SchemaFactory.createForClass(Charger)

ChargerSchema.index({ id: 1 })
ChargerSchema.index({ status: 1 })
ChargerSchema.index({ lastHeartbeat: 1 })
