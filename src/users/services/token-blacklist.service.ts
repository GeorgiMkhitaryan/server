import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { TokenPayload } from '../dto/auth.dto'

@Injectable()
export class TokenBlacklistService implements OnModuleInit {
  private readonly logger = new Logger(TokenBlacklistService.name)
  // In-memory blacklist: token -> expiration timestamp
  // For production, consider using Redis
  private blacklist: Map<string, number> = new Map()

  constructor(private jwtService: JwtService) {}

  onModuleInit() {
    // Clean up expired tokens every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredTokens()
      },
      5 * 60 * 1000,
    )
  }

  /**
   * Add token to blacklist
   * @param token JWT token to blacklist
   */
  async addToBlacklist(token: string): Promise<void> {
    try {
      const decoded = await this.jwtService.verifyAsync<TokenPayload>(token)
      const expirationTime = decoded.exp
        ? decoded.exp * 1000
        : Date.now() + 15 * 60 * 1000 // Default 15 min

      this.blacklist.set(token, expirationTime)
      this.logger.log(`Token blacklisted for user ${decoded.userId}`)
    } catch (error) {
      // If token is invalid, we can still add it to prevent reuse
      this.blacklist.set(token, Date.now() + 15 * 60 * 1000)
      this.logger.warn(`Invalid token added to blacklist: ${error.message}`)
    }
  }

  /**
   * Check if token is blacklisted
   * @param token JWT token to check
   * @returns true if token is blacklisted
   */
  isBlacklisted(token: string): boolean {
    const expirationTime = this.blacklist.get(token)

    if (!expirationTime) {
      return false
    }

    // If token has expired, remove it from blacklist
    if (expirationTime < Date.now()) {
      this.blacklist.delete(token)
      return false
    }

    return true
  }

  /**
   * Remove expired tokens from blacklist
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now()
    let removedCount = 0

    for (const [token, expirationTime] of this.blacklist.entries()) {
      if (expirationTime < now) {
        this.blacklist.delete(token)
        removedCount++
      }
    }

    if (removedCount > 0) {
      this.logger.debug(
        `Cleaned up ${removedCount} expired tokens from blacklist`,
      )
    }
  }

  /**
   * Get blacklist size (for monitoring)
   */
  getBlacklistSize(): number {
    return this.blacklist.size
  }
}
