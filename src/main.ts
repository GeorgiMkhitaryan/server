import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { OCPPGateway } from './ocpp/gateway/ocpp.gateway'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: '*',
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
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT)

  const httpServer = app.getHttpServer()

  const ocppGateway = app.get(OCPPGateway)
  ocppGateway.initializeWebSocketServer(httpServer)

  console.log('═══════════════════════════════════════════════════════')
  console.log('  OCPP Server Started Successfully')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  HTTP Server:    http://localhost:${PORT}`)
  console.log(`WebSocket:      ws://localhost:${PORT}/ocpp`)
  console.log('═══════════════════════════════════════════════════════')
}
bootstrap()
