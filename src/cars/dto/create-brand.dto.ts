import { IsString, IsOptional, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBrandDto {
  @ApiProperty({
    description: 'Brand name',
    example: 'Toyota',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  name: string

  @ApiPropertyOptional({
    description: 'Country of origin',
    example: 'Japan',
  })
  @IsOptional()
  @IsString()
  country?: string
}
