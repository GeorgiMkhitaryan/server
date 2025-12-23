import { Injectable, Logger } from '@nestjs/common';
import { Charger, Connector, ChargerConnection } from '../interfaces/charger.interface';
import { ConnectorStatus, OCPPErrorCode } from '../dto/status-notification.dto';

@Injectable()
export class ChargerService {
  private readonly logger = new Logger(ChargerService.name);
  private chargers: Map<string, Charger> = new Map();
  private connections: Map<string, ChargerConnection> = new Map();

  createCharger(data: {
    id: string;
    chargePointVendor: string;
    chargePointModel: string;
    chargePointSerialNumber?: string;
    firmwareVersion?: string;
    numberOfConnectors?: number;
  }): Charger {
    const connectors: Connector[] = [];
    const numConnectors = data.numberOfConnectors || 2;

    for (let i = 1; i <= numConnectors; i++) {
      connectors.push({
        id: i,
        status: ConnectorStatus.Unavailable,
        errorCode: OCPPErrorCode.NoError,
      });
    }

    const charger: Charger = {
      id: data.id,
      chargePointVendor: data.chargePointVendor,
      chargePointModel: data.chargePointModel,
      chargePointSerialNumber: data.chargePointSerialNumber,
      firmwareVersion: data.firmwareVersion,
      status: 'offline',
      connectors,
      configuration: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.chargers.set(data.id, charger);
    this.logger.log(`Charger ${data.id} created`);
    return charger;
  }

  getCharger(id: string): Charger | undefined {
    return this.chargers.get(id);
  }

  getAllChargers(): Charger[] {
    return Array.from(this.chargers.values());
  }

  updateChargerStatus(id: string, status: 'online' | 'offline'): void {
    const charger = this.chargers.get(id);
    if (charger) {
      charger.status = status;
      charger.updatedAt = new Date();
      if (status === 'online') {
        charger.lastHeartbeat = new Date();
      }
    }
  }

  updateConnectorStatus(
    chargerId: string,
    connectorId: number,
    status: ConnectorStatus,
    errorCode: OCPPErrorCode,
    info?: string,
  ): void {
    const charger = this.chargers.get(chargerId);
    if (charger) {
      const connector = charger.connectors.find((c) => c.id === connectorId);
      if (connector) {
        connector.status = status;
        connector.errorCode = errorCode;
        connector.info = info;
        connector.lastStatusUpdate = new Date();
        charger.updatedAt = new Date();
        this.logger.log(
          `Charger ${chargerId} connector ${connectorId} status: ${status}`,
        );
      }
    }
  }

  updateLastHeartbeat(chargerId: string): void {
    const charger = this.chargers.get(chargerId);
    if (charger) {
      charger.lastHeartbeat = new Date();
      charger.status = 'online';
      charger.updatedAt = new Date();
    }
  }

  registerConnection(chargerId: string, socketId: string): void {
    const connection: ChargerConnection = {
      chargerId,
      socketId,
      connectedAt: new Date(),
      lastMessageAt: new Date(),
    };
    this.connections.set(chargerId, connection);
    this.updateChargerStatus(chargerId, 'online');
    this.logger.log(`Charger ${chargerId} connected (socket: ${socketId})`);
  }

  unregisterConnection(chargerId: string): void {
    this.connections.delete(chargerId);
    this.updateChargerStatus(chargerId, 'offline');
    this.logger.log(`Charger ${chargerId} disconnected`);
  }

  getConnection(chargerId: string): ChargerConnection | undefined {
    return this.connections.get(chargerId);
  }

  getSocketId(chargerId: string): string | undefined {
    return this.connections.get(chargerId)?.socketId;
  }

  updateConfiguration(chargerId: string, key: string, value: string): void {
    const charger = this.chargers.get(chargerId);
    if (charger) {
      if (!charger.configuration) {
        charger.configuration = {};
      }
      charger.configuration[key] = value;
      charger.updatedAt = new Date();
    }
  }

  getConfiguration(chargerId: string): Record<string, string> | undefined {
    return this.chargers.get(chargerId)?.configuration;
  }
}

