import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  listBambooSyncEvents,
} from "./index";
import { GoogleAuthError, GoogleNetworkError, GoogleCalendarConfig, CalendarEventInput } from "./types";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function makeConfig(overrides: Partial<GoogleCalendarConfig> = {}): GoogleCalendarConfig {
  return {
    accessToken: "access-token-123",
    refreshToken: "refresh-token-456",
    onTokenRefresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeEvent(overrides: Partial<CalendarEventInput> = {}): CalendarEventInput {
  return {
    bambooId: "bamboo-1",
    type: "time-off",
    name: "Annual Leave",
    startDate: "2025-07-01",
    endDate: "2025-07-05",
    ...overrides,
  };
}

function okJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function statusResponse(status: number): Response {
  return new Response(null, { status });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------

describe("createEvent", () => {
  it("sends correct body and returns googleEventId", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okJson({ id: "g-event-1" }));
    vi.stubGlobal("fetch", mockFetch);

    const config = makeConfig();
    const event = makeEvent();

    const result = await createEvent(config, event);

    expect(result).toEqual({ googleEventId: "g-event-1" });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(CALENDAR_API_BASE);
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body as string);
    expect(body.summary).toBe("Annual Leave");
    expect(body.start).toEqual({ date: "2025-07-01" });
    expect(body.end).toEqual({ date: "2025-07-06" });
    expect(body.eventType).toBe("outOfOffice");
    expect(body.transparency).toBe("opaque");
  });

  it("stores bambooId and bambooType in extendedProperties", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okJson({ id: "g-event-2" }));
    vi.stubGlobal("fetch", mockFetch);

    const config = makeConfig();
    const event = makeEvent({ bambooId: "b-42", type: "holiday" });

    await createEvent(config, event);

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.extendedProperties.private.bambooId).toBe("b-42");
    expect(body.extendedProperties.private.bambooType).toBe("holiday");
  });
});

// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------

describe("updateEvent", () => {
  it("sends correct PATCH body to the correct URL", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(okJson({ id: "g-event-3" }));
    vi.stubGlobal("fetch", mockFetch);

    const config = makeConfig();
    const event = makeEvent({ name: "Updated Leave" });

    await updateEvent(config, "g-event-3", event);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CALENDAR_API_BASE}/g-event-3`);
    expect(options.method).toBe("PATCH");

    const body = JSON.parse(options.body as string);
    expect(body.summary).toBe("Updated Leave");
    expect(body.extendedProperties.private.bambooId).toBe("bamboo-1");
  });
});

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------

describe("deleteEvent", () => {
  it("sends DELETE to the correct URL", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(statusResponse(204));
    vi.stubGlobal("fetch", mockFetch);

    const config = makeConfig();

    await deleteEvent(config, "g-event-4");

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CALENDAR_API_BASE}/g-event-4`);
    expect(options.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// listBambooSyncEvents
// ---------------------------------------------------------------------------

describe("listBambooSyncEvents", () => {
  it("returns normalised ExistingCalendarEvent array", async () => {
    const apiResponse = {
      items: [
        {
          id: "g-1",
          summary: "Annual Leave",
          start: { date: "2025-07-01" },
          end: { date: "2025-07-06" },
          extendedProperties: {
            private: { bambooId: "b-1", bambooType: "time-off" },
          },
        },
        {
          id: "g-2",
          summary: "Christmas",
          start: { date: "2025-12-25" },
          end: { date: "2025-12-26" },
          extendedProperties: {
            private: { bambooId: "b-2", bambooType: "holiday" },
          },
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValueOnce(okJson(apiResponse));
    vi.stubGlobal("fetch", mockFetch);

    const config = makeConfig();
    const events = await listBambooSyncEvents(config);

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      googleEventId: "g-1",
      bambooId: "b-1",
      type: "time-off",
      name: "Annual Leave",
      startDate: "2025-07-01",
      endDate: "2025-07-05",
    });
    expect(events[1]).toEqual({
      googleEventId: "g-2",
      bambooId: "b-2",
      type: "holiday",
      name: "Christmas",
      startDate: "2025-12-25",
      endDate: "2025-12-25",
    });

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("timeMin=");
    expect(url).toContain("timeMax=");
    expect(url).not.toContain("privateExtendedProperty");
  });
});

// ---------------------------------------------------------------------------
// Token refresh + retry
// ---------------------------------------------------------------------------

describe("401 handling", () => {
  it("refreshes token on 401, retries, and succeeds", async () => {
    const onTokenRefresh = vi.fn().mockResolvedValue(undefined);
    const config = makeConfig({ onTokenRefresh });

    const mockFetch = vi.fn()
      // First calendar API call → 401
      .mockResolvedValueOnce(statusResponse(401))
      // Token refresh endpoint → success
      .mockResolvedValueOnce(
        okJson({ access_token: "new-access-token", refresh_token: "new-refresh-token" })
      )
      // Retry calendar API call → success
      .mockResolvedValueOnce(okJson({ id: "g-event-retry" }));

    vi.stubGlobal("fetch", mockFetch);

    const result = await createEvent(config, makeEvent());

    expect(result).toEqual({ googleEventId: "g-event-retry" });

    // Token refresh endpoint was called
    const tokenCall = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(tokenCall[0]).toBe(TOKEN_ENDPOINT);

    // onTokenRefresh was called with new tokens
    expect(onTokenRefresh).toHaveBeenCalledWith({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    // Retry used new access token
    const retryCall = mockFetch.mock.calls[2] as [string, RequestInit];
    const retryHeaders = retryCall[1].headers as Record<string, string>;
    expect(retryHeaders["Authorization"]).toBe("Bearer new-access-token");
  });

  it("throws GoogleAuthError when retry also returns 401", async () => {
    const config = makeConfig();

    const mockFetch = vi.fn()
      // First call → 401
      .mockResolvedValueOnce(statusResponse(401))
      // Token refresh → success
      .mockResolvedValueOnce(
        okJson({ access_token: "new-access-token" })
      )
      // Retry → 401 again
      .mockResolvedValueOnce(statusResponse(401));

    vi.stubGlobal("fetch", mockFetch);

    await expect(createEvent(config, makeEvent())).rejects.toThrow(GoogleAuthError);
  });
});

// ---------------------------------------------------------------------------
// Network failure
// ---------------------------------------------------------------------------

describe("network failure", () => {
  it("throws GoogleNetworkError when fetch rejects", async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", mockFetch);

    const config = makeConfig();

    await expect(createEvent(config, makeEvent())).rejects.toThrow(GoogleNetworkError);
  });
});
