import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { ConnectorStatus, OCPPErrorCode } from '../dto/status-notification.dto'

export type ConnectorDocument = Connector & Document

@Schema({ timestamps: true })
export class Connector {
  @Prop({
    type: Types.ObjectId,
    ref: 'Charger',
    required: true,
  })
  chargerId: Types.ObjectId

  @Prop({ required: true })
  connectorId: number

  @Prop({ required: true, enum: Object.values(ConnectorStatus) })
  status: ConnectorStatus

  @Prop({ required: true, enum: Object.values(OCPPErrorCode) })
  errorCode: OCPPErrorCode

  @Prop()
  lastStatusUpdate?: Date
  @Prop()
  power: number
  @Prop()
  current: number
  @Prop()
  voltage: number
  @Prop()
  energy: number
}

export const ConnectorSchema = SchemaFactory.createForClass(Connector)
ConnectorSchema.index({ chargerId: 1, connectorId: 1 })
