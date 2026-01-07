import { IsString, IsOptional, IsObject } from 'class-validator'

export class RemoteStartTransactionDto {
  @IsString()
  idTag: string

  @IsOptional()
  @IsObject()
  chargingProfile?: Record<string, any>
}

export class ResetChargerDto {
  @IsOptional()
  type?: 'Hard' | 'Soft'
}
