require('dotenv').config()
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { OCPPGateway } from './ocpp/gateway/ocpp.gateway'
import { WsClientGateway } from './wsClient/ws.client'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173']

  const isDevelopment = process.env.NODE_ENV !== 'production'

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        // In production, be more restrictive with no-origin requests
        if (isDevelopment) {
          return callback(null, true)
        }
        return callback(new Error('Origin is required in production'))
      }

      if (isDevelopment && process.env.ALLOW_ALL_ORIGINS === 'true') {
        return callback(null, true)
      }
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS`))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('OCPP CSMS API')
    .setDescription(
      'Open Charge Point Protocol - Charge Station Management System API',
    )
    .setVersion('1.0')
    .addTag('users', 'User management endpoints')
    .addTag('chargers', 'Charger management endpoints')
    .addTag('transactions', 'Transaction management endpoints')
    .addTag('health', 'Health check endpoints')
    .addTag('cars', 'Car and brand management endpoints')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description:
          'API Key authentication. Format: "Bearer <API_KEY>" or "ApiKey <API_KEY>"',
      },
      'ApiKeyAuth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT',
    )
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  const PORT = process.env.PORT || 3000
  const HOST = process.env.HOST || '0.0.0.0'
  const DOMAIN = process.env.DOMAIN || 'localhost'
  const httpServer = app.getHttpServer()

  const ocppGateway = app.get(OCPPGateway)
  const wsClient = app.get(WsClientGateway)
  ocppGateway.initializeWebSocketServer(httpServer)
  wsClient.initializeWebSocketServer(httpServer)
  await app.listen(PORT, HOST)
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ocpp'
  console.log('═══════════════════════════════════════════════════════')
  console.log('  OCPP CSMS Server Started Successfully')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  HTTP Server:    http://${DOMAIN}:${PORT}`)
  console.log(`  Swagger Docs:   http://${DOMAIN}:${PORT}/docs`)
  console.log(`  OCPP WebSocket: ws://${DOMAIN}:${PORT}/ocpp/{chargePointId}`)
  console.log(`  Client WebSocket: ws://${DOMAIN}:${PORT}/client?id={clientId}`)
  console.log(`  MongoDB:        ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`)
  console.log(`  Environment:    ${process.env.NODE_ENV || 'development'}`)
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Storage: MongoDB')
  console.log('═══════════════════════════════════════════════════════')
}
bootstrap()
