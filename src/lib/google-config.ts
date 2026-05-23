import type { GoogleCalendarConfig } from "@/modules/google-calendar-client/types";
import type { Connection, ConnectionStore } from "@/modules/connection-store/types";

export function buildGoogleCalendarConfig(
  connection: Connection,
  store: ConnectionStore
): GoogleCalendarConfig {
  return {
    accessToken: connection.googleAccessToken,
    refreshToken: connection.googleRefreshToken,
    onTokenRefresh: async (newTokens) => {
      await store.updateTokens(connection.googleAccountId, newTokens);
    },
  };
}
