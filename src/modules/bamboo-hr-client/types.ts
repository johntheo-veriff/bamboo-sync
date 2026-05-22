export class BambooAuthError extends Error {
  constructor(message = "BambooHR authentication failed: invalid API key or subdomain") {
    super(message);
    this.name = "BambooAuthError";
  }
}

export class BambooNetworkError extends Error {
  constructor(message = "BambooHR network request failed") {
    super(message);
    this.name = "BambooNetworkError";
  }
}

export interface BambooHRConfig {
  subdomain: string;
  apiKey: string;
}

export interface TimeOffEntry {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}
