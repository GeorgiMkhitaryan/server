import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { Brand } from 'src/cars/schemas/brand.schema'
import { Car } from 'src/cars/schemas/car.schema'

export type UserDocument = User & Document

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string

  @Prop({ required: true, unique: true })
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

  @Prop({ type: Types.ObjectId, ref: Brand.name, required: true })
  carBrandId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: Car.name, required: true })
  carModelId: Types.ObjectId

  @Prop({ default: true })
  terms_agreement: boolean
}

export const UserSchema = SchemaFactory.createForClass(User)

UserSchema.index({ isActive: 1 })
