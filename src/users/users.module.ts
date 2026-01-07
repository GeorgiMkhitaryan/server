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

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],
  providers: [UserService, TokenBlacklistService, JwtStrategy, JwtAuthGuard],
  controllers: [UsersController],
  exports: [UserService, JwtAuthGuard],
})
export class UsersModule {}
