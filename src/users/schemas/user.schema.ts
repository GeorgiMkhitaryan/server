import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserDocument = User & Document

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  email: string

  @Prop({ required: true, unique: true, index: true })
  phone: string

  @Prop({ required: true })
  password: string

  @Prop({ required: true })
  firstName: string

  @Prop({ required: true })
  lastName: string

  @Prop({ default: true })
  isActive: boolean

  @Prop({ default: 'user' })
  role: 'user' | 'admin'

  @Prop()
  lastLogin?: Date

  @Prop()
  refreshToken?: string
}

export const UserSchema = SchemaFactory.createForClass(User)

UserSchema.index({ email: 1 })
UserSchema.index({ phone: 1 })
UserSchema.index({ isActive: 1 })
