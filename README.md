# OCPP CSMS Server

Open Charge Point Protocol - Charge Station Management System API

## Security

**IMPORTANT: Never commit secrets to version control**

### Environment Variables

All sensitive configuration should be set via environment variables:

1. **Copy `.env.example` to `.env`** (already in `.gitignore`)
2. **Set `JWT_SECRET`** - Generate a strong secret:
   ```bash
   openssl rand -base64 32
   ```
3. **Set `API_KEY`** for API authentication
4. **Set `MONGODB_URI`** for database connection

### Production Deployment

In production, set environment variables directly on the server or use a secrets manager:

```bash
export JWT_SECRET="your-generated-secret-here"
export API_KEY="your-api-key-here"
export MONGODB_URI="mongodb://your-connection-string"
```

Never store secrets in files that are committed to git.

## Installation

```bash
npm install
```

## Running the app

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## API Documentation

Swagger UI available at: `http://localhost:3000/docs`

## Environment Variables

See `.env.example` for all available configuration options.
