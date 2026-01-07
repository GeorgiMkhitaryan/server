import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { Brand } from './brand.schema'

export type CarDocument = Car & Document

@Schema({ timestamps: true })
export class Car {
  @Prop({ type: Types.ObjectId, ref: Brand.name, required: true, index: true })
  brand: Types.ObjectId

  @Prop({ required: true })
  model: string

  @Prop({ required: true })
  year: number

  @Prop()
  engine?: string
}

export const CarSchema = SchemaFactory.createForClass(Car)

CarSchema.index({ brand: 1 })
CarSchema.index({ model: 1 })
CarSchema.index({ year: 1 })
