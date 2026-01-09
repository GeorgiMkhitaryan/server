import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type MarkerDocument = Marker & Document

@Schema({ timestamps: true })
export class Marker {
  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  latitude: number

  @Prop({ required: true })
  longitude: number

  @Prop()
  description?: string

  @Prop()
  address?: string

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Charger' }], default: [] })
  chargerIds: Types.ObjectId[]
}

export const MarkerSchema = SchemaFactory.createForClass(Marker)

MarkerSchema.index({ latitude: 1, longitude: 1 })
MarkerSchema.index({ name: 1 })
