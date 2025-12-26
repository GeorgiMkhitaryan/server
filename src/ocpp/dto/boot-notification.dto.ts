import { IsString, IsOptional } from 'class-validator';

export class BootNotificationRequestDto {
  @IsString()
  chargePointVendor: string;

  @IsString()
  chargePointModel: string;

  @IsOptional()
  @IsString()
  chargePointSerialNumber?: string;

  @IsOptional()
  @IsString()
  chargeBoxSerialNumber?: string;

  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @IsOptional()
  @IsString()
  iccid?: string;

  @IsOptional()
  @IsString()
  imsi?: string;

  @IsOptional()
  @IsString()
  meterSerialNumber?: string;

  @IsOptional()
  @IsString()
  meterType?: string;
}

export class BootNotificationResponseDto {
  status: 'Accepted' | 'Pending' | 'Rejected';
  currentTime: string;
  interval?: number;
}

