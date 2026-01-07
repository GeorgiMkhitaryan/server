import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)
  private readonly apiKey = process.env.API_KEY || process.env.API_SECRET

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()

    // Skip authentication for WebSocket upgrade requests
    // WebSocket connections are handled by WebSocket servers, not HTTP controllers
    if (
      req.headers.upgrade === 'websocket' ||
      req.url?.startsWith('/client') ||
      req.url?.startsWith('/ocpp')
    ) {
      return true
    }

    // Skip authentication if no API key is configured (development mode)
    if (!this.apiKey) {
      this.logger.warn(
        'API_KEY not configured. Authentication is disabled. Set API_KEY environment variable for production.',
      )
      return true
    }

    const authHeader = req.headers.authorization

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required')
    }

    // Support both "Bearer <token>" and "ApiKey <key>" formats
    const parts = authHeader.split(' ')
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid authorization header format')
    }

    const [scheme, token] = parts
    const isValid =
      (scheme === 'Bearer' || scheme === 'ApiKey') && token === this.apiKey

    if (!isValid) {
      this.logger.warn(`Invalid API key attempt from ${req.ip}`)
      throw new UnauthorizedException('Invalid API key')
    }

    return true
  }
}
