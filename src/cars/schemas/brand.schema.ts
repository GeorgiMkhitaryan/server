import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type BrandDocument = Brand & Document

@Schema({ timestamps: true })
export class Brand {
  @Prop({ required: true, unique: true, index: true })
  name: string

  @Prop()
  country?: string
}

export const BrandSchema = SchemaFactory.createForClass(Brand)

BrandSchema.index({ name: 1 })
