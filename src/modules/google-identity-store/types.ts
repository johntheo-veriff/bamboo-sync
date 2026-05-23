export interface GoogleIdentity {
  googleAccountId: string;
  refreshToken: string;
  email: string;
}

export interface GoogleIdentityStore {
  get(googleAccountId: string): Promise<GoogleIdentity | null>;
  save(identity: GoogleIdentity): Promise<void>;
}
