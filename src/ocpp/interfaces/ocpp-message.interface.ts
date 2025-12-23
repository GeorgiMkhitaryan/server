export enum OCPPAction {
  // Core Profile - From Charge Point
  Authorize = 'Authorize',
  BootNotification = 'BootNotification',
  DataTransfer = 'DataTransfer',
  Heartbeat = 'Heartbeat',
  MeterValues = 'MeterValues',
  StartTransaction = 'StartTransaction',
  StatusNotification = 'StatusNotification',
  StopTransaction = 'StopTransaction',

  // Core Profile - From Central System
  ChangeAvailability = 'ChangeAvailability',
  ChangeConfiguration = 'ChangeConfiguration',
  ClearCache = 'ClearCache',
  GetConfiguration = 'GetConfiguration',
  RemoteStartTransaction = 'RemoteStartTransaction',
  RemoteStopTransaction = 'RemoteStopTransaction',
  Reset = 'Reset',
  UnlockConnector = 'UnlockConnector',

  // Smart Charging Profile
  SetChargingProfile = 'SetChargingProfile',
  ClearChargingProfile = 'ClearChargingProfile',
  GetChargingProfiles = 'GetChargingProfiles',
  NotifyChargingLimit = 'NotifyChargingLimit',

  // Firmware Management Profile
  UpdateFirmware = 'UpdateFirmware',
  FirmwareStatusNotification = 'FirmwareStatusNotification',
}

export enum OCPPMessageType {
  CALL = 2,
  CALLRESULT = 3,
  CALLERROR = 4,
}

export interface OCPPMessage {
  [0]: OCPPMessageType;
  [1]: string; // Unique message ID
  [2]: string | OCPPRequestPayload | OCPPResponsePayload | OCPPErrorPayload;
}

export interface OCPPRequestPayload {
  action: OCPPAction;
  payload: any;
}

export interface OCPPResponsePayload {
  payload: any;
}

export interface OCPPErrorPayload {
  errorCode: OCPPErrorCode;
  errorDescription: string;
  errorDetails?: any;
}

export enum OCPPErrorCode {
  NotImplemented = 'NotImplemented',
  NotSupported = 'NotSupported',
  InternalError = 'InternalError',
  ProtocolError = 'ProtocolError',
  SecurityError = 'SecurityError',
  FormationViolation = 'FormationViolation',
  PropertyConstraintViolation = 'PropertyConstraintViolation',
  OccurrenceConstraintViolation = 'OccurrenceConstraintViolation',
  TypeConstraintViolation = 'TypeConstraintViolation',
  GenericError = 'GenericError',
}

