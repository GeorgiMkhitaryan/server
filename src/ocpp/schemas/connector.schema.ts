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
    index: true,
  })
  chargerId: Types.ObjectId

  @Prop({ required: true, index: true })
  connectorId: number

  @Prop({ required: true, enum: Object.values(ConnectorStatus) })
  status: ConnectorStatus

  @Prop({ required: true, enum: Object.values(OCPPErrorCode) })
  errorCode: OCPPErrorCode

  @Prop()
  lastStatusUpdate?: Date
}

export const ConnectorSchema = SchemaFactory.createForClass(Connector)
ConnectorSchema.index({ chargerId: 1, connectorId: 1 })
