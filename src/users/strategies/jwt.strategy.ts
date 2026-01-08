import { Injectable, UnauthorizedException, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserService } from '../services/user.service'
import { TokenBlacklistService } from '../services/token-blacklist.service'
import { TokenPayload } from '../dto/auth.dto'
import { JWT_SECRET } from '../constants/jwt.constants'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name)

  constructor(
    private userService: UserService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
      passReqToCallback: true,
    })
  }

  async validate(req: any, payload: TokenPayload) {
    if (!payload || !payload.userId) {
      this.logger.warn('Invalid token payload: missing userId')
      throw new UnauthorizedException('Invalid token payload')
    }

    // Extract token from request header
    const authHeader = req.headers?.authorization
    const token = authHeader?.replace('Bearer ', '')

    // Check if token is blacklisted
    if (token && this.tokenBlacklistService.isBlacklisted(token)) {
      this.logger.warn(`Blacklisted token used by user ${payload.userId}`)
      throw new UnauthorizedException('Token has been revoked')
    }

    try {
      const user = await this.userService.getUserById(payload.userId)

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive')
      }

      return {
        userId: user.id,
        phone: user.phone,
        role: user.role,
      }
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`)
      throw error
    }
  }
}
