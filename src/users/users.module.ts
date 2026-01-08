import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { User, UserSchema } from './schemas/user.schema'
import { UserService } from './services/user.service'
import { TokenBlacklistService } from './services/token-blacklist.service'
import { UsersController } from './controllers/users.controller'
import { JwtStrategy } from './strategies/jwt.strategy'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { JWT_SECRET, JWT_ACCESS_TOKEN_EXPIRY } from './constants/jwt.constants'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: {
        expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
      },
    }),
  ],
  providers: [UserService, TokenBlacklistService, JwtStrategy, JwtAuthGuard],
  controllers: [UsersController],
  exports: [UserService, JwtAuthGuard],
})
export class UsersModule {}
