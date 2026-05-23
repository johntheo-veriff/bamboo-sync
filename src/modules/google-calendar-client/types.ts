export class GoogleAuthError extends Error {
  constructor(message = "Google authentication failed") {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export class GoogleNetworkError extends Error {
  constructor(message = "Google network request failed") {
    super(message);
    this.name = "GoogleNetworkError";
  }
}

export interface GoogleCalendarConfig {
  accessToken: string;
  refreshToken: string;
  onTokenRefresh: (newTokens: { accessToken: string; refreshToken: string }) => Promise<void>;
}

export interface CalendarEventInput {
  bambooId: string;
  type: "time-off" | "holiday";
  name: string;
  startDate: string; // ISO date
  endDate: string;
}

export interface ExistingCalendarEvent {
  googleEventId: string;
  bambooId: string;
  type: "time-off" | "holiday";
  name: string;
  startDate: string;
  endDate: string;
}
