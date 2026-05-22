import {
  CalendarEventInput,
  ExistingCalendarEvent,
  GoogleAuthError,
  GoogleCalendarConfig,
  GoogleNetworkError,
} from "./types";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function buildEventBody(event: CalendarEventInput): object {
  return {
    summary: event.name,
    start: { date: event.startDate },
    end: { date: event.endDate },
    colorId: event.colorId,
    extendedProperties: {
      private: {
        bambooId: event.bambooId,
        bambooType: event.type,
      },
    },
  };
}

async function refreshAccessToken(
  config: GoogleCalendarConfig
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: config.refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  });

  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (err) {
    throw new GoogleNetworkError(`Token refresh network error: ${String(err)}`);
  }

  if (!response.ok) {
    throw new GoogleAuthError("Token refresh failed");
  }

  const data = (await response.json()) as { access_token: string; refresh_token?: string };
  const newAccessToken = data.access_token;
  const newRefreshToken = data.refresh_token ?? config.refreshToken;

  await config.onTokenRefresh({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });

  return newAccessToken;
}

async function fetchWithAuth(
  config: GoogleCalendarConfig,
  url: string,
  options: RequestInit
): Promise<Response> {
  const headersWithAuth = {
    ...(options.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${config.accessToken}`,
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers: headersWithAuth });
  } catch (err) {
    throw new GoogleNetworkError(`Network error: ${String(err)}`);
  }

  if (response.status !== 401) {
    return response;
  }

  // Token expired — refresh and retry once
  const newAccessToken = await refreshAccessToken(config);
  const retryHeaders = {
    ...(options.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${newAccessToken}`,
  };

  let retryResponse: Response;
  try {
    retryResponse = await fetch(url, { ...options, headers: retryHeaders });
  } catch (err) {
    throw new GoogleNetworkError(`Network error on retry: ${String(err)}`);
  }

  if (retryResponse.status === 401) {
    throw new GoogleAuthError("Authentication failed after token refresh");
  }

  return retryResponse;
}

export async function createEvent(
  config: GoogleCalendarConfig,
  event: CalendarEventInput
): Promise<{ googleEventId: string }> {
  const response = await fetchWithAuth(config, CALENDAR_API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildEventBody(event)),
  });

  if (!response.ok) {
    throw new GoogleNetworkError(`Create event failed with status ${response.status}`);
  }

  const data = (await response.json()) as { id: string };
  return { googleEventId: data.id };
}

export async function updateEvent(
  config: GoogleCalendarConfig,
  googleEventId: string,
  event: CalendarEventInput
): Promise<void> {
  const url = `${CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`;
  const response = await fetchWithAuth(config, url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildEventBody(event)),
  });

  if (!response.ok) {
    throw new GoogleNetworkError(`Update event failed with status ${response.status}`);
  }
}

export async function deleteEvent(
  config: GoogleCalendarConfig,
  googleEventId: string
): Promise<void> {
  const url = `${CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`;
  const response = await fetchWithAuth(config, url, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    throw new GoogleNetworkError(`Delete event failed with status ${response.status}`);
  }
}

export async function listBambooSyncEvents(
  config: GoogleCalendarConfig
): Promise<ExistingCalendarEvent[]> {
  const url = `${CALENDAR_API_BASE}?privateExtendedProperty=bambooId`;
  const response = await fetchWithAuth(config, url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new GoogleNetworkError(`List events failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      start?: { date?: string };
      end?: { date?: string };
      extendedProperties?: { private?: { bambooId?: string; bambooType?: string } };
    }>;
  };

  return (data.items ?? []).map((item) => ({
    googleEventId: item.id,
    bambooId: item.extendedProperties?.private?.bambooId ?? "",
    type: (item.extendedProperties?.private?.bambooType ?? "time-off") as "time-off" | "holiday",
    name: item.summary ?? "",
    startDate: item.start?.date ?? "",
    endDate: item.end?.date ?? "",
  }));
}
