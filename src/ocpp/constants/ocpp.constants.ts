/**
 * OCPP Gateway Constants
 */
export const OCPP_CONSTANTS = {
  // Heartbeat interval in seconds (5 minutes)
  HEARTBEAT_INTERVAL: 300,

  // Ping interval in milliseconds (30 seconds)
  PING_INTERVAL_MS: 30000,

  // Command timeout in milliseconds (30 seconds)
  COMMAND_TIMEOUT_MS: 30000,

  // Maximum pending callbacks before cleanup
  MAX_PENDING_CALLBACKS: 1000,

  // Maximum WebSocket connections
  MAX_CONNECTIONS: 1000,

  // Default number of connectors
  DEFAULT_CONNECTOR_COUNT: 2,

  // Maximum charger ID length
  MAX_CHARGER_ID_LENGTH: 100,

  // Maximum connector ID
  MAX_CONNECTOR_ID: 1000,
} as const

