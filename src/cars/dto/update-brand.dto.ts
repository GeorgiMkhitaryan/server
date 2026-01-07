import { IsString, IsOptional, MinLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateBrandDto {
  @ApiPropertyOptional({
    description: 'Brand name',
    example: 'Toyota',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string

  @ApiPropertyOptional({
    description: 'Country of origin',
    example: 'Japan',
  })
  @IsOptional()
  @IsString()
  country?: string
}
