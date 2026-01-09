import { IsString, IsNumber, IsOptional, Min, Max, IsArray } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateMarkerDto {
  @ApiPropertyOptional({
    description: 'Marker name',
    example: 'Charging Station #1',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 40.7128,
    type: Number,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: -74.0060,
    type: Number,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number

  @ApiPropertyOptional({
    description: 'Marker description',
    example: 'Fast charging station with 4 connectors',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({
    description: 'Physical address',
    example: '123 Main St, New York, NY 10001',
    type: String,
  })
  @IsOptional()
  @IsString()
  address?: string
  
  @ApiPropertyOptional({
    description: 'Charger IDs',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chargerIds?: string[]
}
