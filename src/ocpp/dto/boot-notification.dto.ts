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
  firmwareVersion?: string;
}

export class BootNotificationResponseDto {
  status: 'Accepted' | 'Pending' | 'Rejected';
  currentTime: string;
  interval?: number;
}

