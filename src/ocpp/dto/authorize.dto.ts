import { IsString } from 'class-validator';

export class AuthorizeRequestDto {
  @IsString()
  idTag: string;
}

export class IdTagInfoDto {
  status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
  expiryDate?: string;
  parentIdTag?: string;
}

export class AuthorizeResponseDto {
  idTagInfo: IdTagInfoDto;
}

