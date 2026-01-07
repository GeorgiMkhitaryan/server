import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsBoolean,
  isString,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class VerifyUserDto {
  @ApiProperty({
    description: 'Phone Number to verify',
    example: '+37499123456',
    type: String,
  })
  @MinLength(11)
  phone: string
}

export class VerifyUserResDto {
  @ApiProperty({
    description: 'Phone Number to verify',
    example: '+37499123456',
    type: String,
  })
  @MinLength(6)
  otpCode: string
}

export class RegisterUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    type: String,
  })
  @IsEmail()
  email: string

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6)
  password: string

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
  })
  @IsString()
  firstName: string

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
  })
  @IsString()
  lastName: string

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
    type: String,
  })
  @IsOptional()
  @IsString()
  phone?: string
}

export class LoginUserDto {
  @ApiProperty({
    description: 'User phone number',
    example: '+37499123456',
    type: String,
  })
  @IsString()
  phone: string

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    type: String,
  })
  @IsString()
  password: string
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    type: String,
  })
  @IsOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    type: String,
  })
  @IsOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
    type: String,
  })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({
    description: 'User active status',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'oldpassword123',
    type: String,
  })
  @IsString()
  @MinLength(6)
  currentPassword: string

  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'newpassword123',
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6)
  newPassword: string
}

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  id: string

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    type: String,
  })
  email: string

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    type: String,
  })
  firstName: string

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    type: String,
  })
  lastName: string

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
    type: String,
  })
  phone?: string

  @ApiProperty({
    description: 'User active status',
    example: true,
    type: Boolean,
  })
  isActive: boolean

  @ApiProperty({
    description: 'User role',
    enum: ['user', 'admin'],
    example: 'user',
  })
  role: 'user' | 'admin'

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
  })
  lastLogin?: Date

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
  })
  createdAt: Date

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
  })
  updatedAt: Date
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  user: UserResponseDto

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  accessToken: string

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  refreshToken: string
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  accessToken: string

  @ApiProperty({
    description: 'New JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  refreshToken: string
}
