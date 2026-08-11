export {};

export interface ClientLicenseStatus {
  activated: boolean;
  customerName?: string;
  licenseType?: 'permanent' | 'subscription';
  expiresAt?: string | null;
  offlineUntil?: string | null;
  deviceId: string;
  reason?: string;
}

export interface ClientAppInfo {
  version: string;
  development: boolean;
  contentReady: boolean;
  contentVersion?: string;
}

declare global {
  interface Window {
    aibookClient?: {
      readonly isDesktop: true;
      getLicenseStatus: () => Promise<ClientLicenseStatus>;
      activate: (activationCode: string) => Promise<ClientLicenseStatus>;
      getAppInfo: () => Promise<ClientAppInfo>;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
  }
}
