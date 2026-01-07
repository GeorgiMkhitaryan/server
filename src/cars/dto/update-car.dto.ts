import { IsString, IsOptional, IsNumber, IsMongoId, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateCarDto {
  @ApiPropertyOptional({
    description: 'Brand ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  brand?: string

  @ApiPropertyOptional({
    description: 'Car model',
    example: 'Camry',
  })
  @IsOptional()
  @IsString()
  model?: string

  @ApiPropertyOptional({
    description: 'Manufacturing year',
    example: 2023,
    minimum: 1900,
    maximum: 2100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  year?: number

  @ApiPropertyOptional({
    description: 'Engine specification',
    example: '2.5L V6',
  })
  @IsOptional()
  @IsString()
  engine?: string
}
