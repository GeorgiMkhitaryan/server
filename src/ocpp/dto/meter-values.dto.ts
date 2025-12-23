import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SampledValueDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  context?: 'Interruption.Begin' | 'Interruption.End' | 'Sample.Clock' | 'Sample.Periodic' | 'Transaction.Begin' | 'Transaction.End';

  @IsOptional()
  @IsString()
  format?: 'Raw' | 'SignedData';

  @IsOptional()
  @IsString()
  measurand?: string;

  @IsOptional()
  @IsString()
  location?: 'Cable' | 'EV' | 'Inlet' | 'Outlet';

  @IsOptional()
  @IsString()
  phase?: 'L1' | 'L2' | 'L3' | 'N' | 'L1-N' | 'L2-N' | 'L3-N' | 'L1-L2' | 'L2-L3' | 'L3-L1';

  @IsOptional()
  @IsString()
  unit?: string;
}

export class MeterValueDto {
  @IsString()
  timestamp: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SampledValueDto)
  sampledValue: SampledValueDto[];
}

export class MeterValuesRequestDto {
  @IsNumber()
  connectorId: number;

  @IsOptional()
  @IsNumber()
  transactionId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeterValueDto)
  meterValue: MeterValueDto[];
}

export class MeterValuesResponseDto {
  // Empty response for MeterValues
}

