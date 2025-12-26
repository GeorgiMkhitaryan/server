import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type ChargerConnectionDocument = ChargerConnection & Document

@Schema({ timestamps: true })
export class ChargerConnection {
  @Prop({ required: true, unique: true, index: true })
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
ChargerConnectionSchema.index({ chargerId: 1 })
ChargerConnectionSchema.index({ connectedAt: -1 })

