import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { OCPPGateway } from './ocpp/gateway/ocpp.gateway'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // CORS configuration - restrict to known origins in production
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'] // Default dev origins

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true)
      }
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  const PORT = process.env.PORT || 3000
  const HOST = process.env.HOST || '0.0.0.0'
  const DOMAIN = process.env.DOMAIN || 'localhost'

  await app.listen(PORT, HOST)

  const httpServer = app.getHttpServer()

  const ocppGateway = app.get(OCPPGateway)
  ocppGateway.initializeWebSocketServer(httpServer)

  const mongoUri = process.env.MONGODB_URI 

  console.log('')
  console.log('═══════════════════════════════════════════════════════')
  console.log('  OCPP CSMS Server Started Successfully')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  HTTP Server:    http://${DOMAIN}:${PORT}`)
  console.log(`  WebSocket:      ws://${DOMAIN}:${PORT}/ocpp/{chargePointId}`)
  console.log(`  WebSocket SSL:  wss://${DOMAIN}/ocpp/{chargePointId}`)
  console.log(`  MongoDB:        ${mongoUri}`)
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Contract: See CONTRACT.md')
  console.log('  OCPP Version: 1.6J (JSON over WebSocket)')
  console.log('  Storage: MongoDB')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
}
bootstrap()
