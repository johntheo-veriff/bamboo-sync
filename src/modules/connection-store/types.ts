export type SyncStatus = "ok" | "error" | "pending";

export interface Connection {
  googleAccountId: string;
  userEmail: string;
  bambooSubdomain: string;
  bambooApiKey: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  lastSyncStatus: SyncStatus;
  lastSyncError: string | null;
  nextSyncAt: Date;
  createdAt: Date;
  userTimezone?: string; // IANA timezone from user's browser, captured at connect/sync time
}

export interface ConnectionStore {
  get(googleAccountId: string): Promise<Connection | null>;
  save(connection: Connection): Promise<void>;
  delete(googleAccountId: string): Promise<void>;
  listAll(): Promise<Connection[]>;
  updateSyncResult(
    googleAccountId: string,
    result: { status: SyncStatus; error: string | null; nextSyncAt: Date }
  ): Promise<void>;
  updateTokens(
    googleAccountId: string,
    tokens: { accessToken: string; refreshToken: string }
  ): Promise<void>;
  updateTimezone(googleAccountId: string, userTimezone: string): Promise<void>;
}
