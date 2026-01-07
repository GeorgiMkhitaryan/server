import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { JwtService } from '@nestjs/jwt'
import { Model } from 'mongoose'
import { User, UserDocument } from '../schemas/user.schema'
import {
  RegisterUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UserResponseDto,
  LoginResponseDto,
} from '../dto/user.dto'
import { TokenPayload, RefreshTokenDto } from '../dto/auth.dto'
import { TokenBlacklistService } from './token-blacklist.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)
  private readonly saltRounds = 10
  private readonly accessTokenExpiry = '15m'
  private readonly refreshTokenExpiry = '7d'

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  verifyUser(phone: string): string {
    return '123456'
  }

  async register(registerDto: RegisterUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userModel.findOne({
      phone: registerDto.phone.toLowerCase(),
    })

    if (existingUser) {
      throw new ConflictException('User with this email already exists')
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.saltRounds,
    )

    const user = new this.userModel({
      email: registerDto.email.toLowerCase(),
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phone: registerDto.phone,
      isActive: true,
      role: 'user',
    })

    await user.save()
    this.logger.log(`User registered: ${user.phone}`)

    return this.toUserResponseDto(user)
  }

  async login(phone: string, password: string): Promise<LoginResponseDto> {
    const user = await this.userModel.findOne({
      phone: phone.toLowerCase(),
    })

    if (!user) {
      throw new UnauthorizedException('Invalid phone or password')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone or password')
    }

    // Generate tokens
    const tokens = await this.generateTokens(user)

    // Update user
    user.lastLogin = new Date()
    user.refreshToken = tokens.refreshToken
    await user.save()

    this.logger.log(`User logged in: ${user.phone}`)

    return {
      user: this.toUserResponseDto(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
  }

  async generateTokens(user: UserDocument): Promise<{
    accessToken: string
    refreshToken: string
  }> {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.accessTokenExpiry,
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.refreshTokenExpiry,
      }),
    ])

    return { accessToken, refreshToken }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
    accessToken: string
    refreshToken: string
  }> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshTokenDto.refreshToken,
      )

      const user = await this.userModel.findById(payload.userId)

      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive')
      }

      if (user.refreshToken !== refreshTokenDto.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token')
      }

      const tokens = await this.generateTokens(user)

      user.refreshToken = tokens.refreshToken
      await user.save()

      this.logger.log(`Token refreshed for user: ${user.phone}`)

      return tokens
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token)
      return payload
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }

  async logout(userId: string, accessToken?: string): Promise<void> {
    const user = await this.userModel.findById(userId)

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`)
    }

    // Add access token to blacklist if provided
    if (accessToken) {
      await this.tokenBlacklistService.addToBlacklist(accessToken)
    }

    // Clear refresh token from database
    user.refreshToken = undefined
    await user.save()

    this.logger.log(`User logged out: ${user.phone}`)
  }

  async validateUserById(userId: string): Promise<UserResponseDto | null> {
    const user = await this.userModel.findById(userId).lean()

    if (!user || !user.isActive) {
      return null
    }

    return this.toUserResponseDto(user)
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id).lean()

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    return this.toUserResponseDto(user)
  }

  async getUserByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .lean()

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`)
    }

    return this.toUserResponseDto(user)
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userModel.find().lean()
    return users.map((user) => this.toUserResponseDto(user))
  }

  async updateUser(
    id: string,
    updateDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id)

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    if (updateDto.firstName !== undefined) {
      user.set('firstName', updateDto.firstName)
    }
    if (updateDto.lastName !== undefined) {
      user.set('lastName', updateDto.lastName)
    }
    if (updateDto.phone !== undefined) {
      user.set('phone', updateDto.phone)
    }
    if (updateDto.isActive !== undefined) {
      user.set('isActive', updateDto.isActive)
    }

    await user.save()
    this.logger.log(`User updated: ${user.email}`)

    return this.toUserResponseDto(user)
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userModel.findById(id)

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    )

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect')
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      this.saltRounds,
    )

    user.password = hashedNewPassword
    // Invalidate all tokens by clearing refresh token
    user.refreshToken = undefined
    await user.save()

    this.logger.log(
      `Password changed for user: ${user.email}. All tokens invalidated.`,
    )
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userModel.findById(id)

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    await this.userModel.deleteOne({ _id: id })
    this.logger.log(`User deleted: ${user.email}`)
  }

  private toUserResponseDto(user: UserDocument | any): UserResponseDto {
    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isActive: user.isActive,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
