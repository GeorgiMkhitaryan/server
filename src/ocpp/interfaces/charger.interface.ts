import { ConnectorStatus, OCPPErrorCode } from '../dto/status-notification.dto';

export interface Charger {
  id: string;
  chargePointVendor: string;
  chargePointModel: string;
  chargePointSerialNumber?: string;
  firmwareVersion?: string;
  status: 'online' | 'offline';
  lastHeartbeat?: Date;
  connectors: Connector[];
  configuration?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Connector {
  id: number;
  status: ConnectorStatus;
  errorCode: OCPPErrorCode;
  info?: string;
  lastStatusUpdate?: Date;
}

export interface ChargerConnection {
  chargerId: string;
  socketId: string;
  connectedAt: Date;
  lastMessageAt?: Date;
}

