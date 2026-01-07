import { IsString, IsNotEmpty, IsNumber, IsOptional, IsMongoId, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCarDto {
  @ApiProperty({
    description: 'Brand ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  brand: string

  @ApiProperty({
    description: 'Car model',
    example: 'Camry',
  })
  @IsString()
  @IsNotEmpty()
  model: string

  @ApiProperty({
    description: 'Manufacturing year',
    example: 2023,
    minimum: 1900,
    maximum: 2100,
  })
  @IsNumber()
  @Min(1900)
  @Max(2100)
  year: number

  @ApiPropertyOptional({
    description: 'Engine specification',
    example: '2.5L V6',
  })
  @IsOptional()
  @IsString()
  engine?: string
}
