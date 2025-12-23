export interface Transaction {
  id: number;
  chargerId: string;
  connectorId: number;
  idTag: string;
  meterStart: number;
  meterStop?: number;
  startTime: Date;
  stopTime?: Date;
  stopReason?: 'DeAuthorized' | 'EmergencyStop' | 'EVDisconnected' | 'HardReset' | 'Local' | 'Other' | 'PowerLoss' | 'Reboot' | 'Remote' | 'SoftReset' | 'UnlockCommand';
  status: 'active' | 'completed' | 'stopped';
  energyConsumed?: number; // in kWh
  createdAt: Date;
  updatedAt: Date;
}

export interface MeterValue {
  transactionId: number;
  timestamp: Date;
  connectorId: number;
  sampledValues: {
    value: string;
    measurand: string;
    unit?: string;
    context?: string;
  }[];
}

