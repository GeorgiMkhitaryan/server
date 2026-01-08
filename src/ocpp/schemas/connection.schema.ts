import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type ChargerConnectionDocument = ChargerConnection & Document

@Schema({ timestamps: true })
export class ChargerConnection {
  @Prop({ required: true, unique: true })
  chargerId: string

  @Prop({ required: true })
  status: string

  @Prop({ required: true })
  socketId: string

  @Prop({ required: true, default: Date.now })
  connectedAt: Date

  @Prop()
  lastMessageAt?: Date
}

export const ChargerConnectionSchema =
  SchemaFactory.createForClass(ChargerConnection)

// Indexes
// Note: 'chargerId' field has unique: true, so index is created automatically
ChargerConnectionSchema.index({ connectedAt: -1 })

