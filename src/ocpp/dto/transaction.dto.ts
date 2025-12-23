import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class StartTransactionRequestDto {
  @IsNumber()
  connectorId: number;

  @IsString()
  idTag: string;

  @IsNumber()
  meterStart: number;

  @IsString()
  timestamp: string;

  @IsOptional()
  @IsNumber()
  reservationId?: number;
}

export class StartTransactionResponseDto {
  transactionId: number;
  idTagInfo: {
    status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
    expiryDate?: string;
    parentIdTag?: string;
  };
}

export class StopTransactionRequestDto {
  @IsString()
  idTag: string;

  @IsString()
  meterStop: string;

  @IsString()
  timestamp: string;

  @IsNumber()
  transactionId: number;

  @IsOptional()
  reason?: 'DeAuthorized' | 'EmergencyStop' | 'EVDisconnected' | 'HardReset' | 'Local' | 'Other' | 'PowerLoss' | 'Reboot' | 'Remote' | 'SoftReset' | 'UnlockCommand';

  @IsOptional()
  @IsObject()
  transactionData?: any[];
}

export class StopTransactionResponseDto {
  idTagInfo?: {
    status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
    expiryDate?: string;
    parentIdTag?: string;
  };
}

