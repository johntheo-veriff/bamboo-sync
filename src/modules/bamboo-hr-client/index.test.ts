import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchTimeOffEntries, fetchHolidays } from "./index";
import { BambooAuthError, BambooNetworkError, BambooHRConfig } from "./types";

const config: BambooHRConfig = { subdomain: "acme", apiKey: "test-key" };

// Fixed "today" for deterministic date filtering tests
const TODAY = "2026-05-22";
const FUTURE = "2026-07-01";
const PAST = "2026-04-01";
const FAR_FUTURE = "2027-05-22";

function mockResponse(body: unknown, status = 200): Response {
  return {
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  // Freeze Date so "today()" inside the module returns TODAY
  vi.useFakeTimers();
  vi.setSystemTime(new Date(TODAY));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// fetchTimeOffEntries
// ---------------------------------------------------------------------------

describe("fetchTimeOffEntries", () => {
  it("returns a normalised TimeOffEntry array on 200", async () => {
    const raw = [
      { id: 1, name: "PTO", start: FUTURE, end: "2026-07-05" },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(raw)));

    const entries = await fetchTimeOffEntries(config);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      id: "1",
      name: "PTO",
      startDate: FUTURE,
      endDate: "2026-07-05",
    });
  });

  it("maps `start`/`end` API fields to `startDate`/`endDate`", async () => {
    const raw = [{ id: 2, name: "Sick", start: TODAY, end: TODAY }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(raw)));

    const entries = await fetchTimeOffEntries(config);

    expect(entries[0].startDate).toBe(TODAY);
    expect(entries[0].endDate).toBe(TODAY);
  });

  it("filters out entries whose startDate is before today", async () => {
    const raw = [
      { id: 10, name: "Old PTO", start: PAST, end: PAST },
      { id: 11, name: "Future PTO", start: FUTURE, end: FUTURE },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(raw)));

    const entries = await fetchTimeOffEntries(config);

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("11");
  });

  it("throws BambooAuthError on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse({}, 401)));

    await expect(fetchTimeOffEntries(config)).rejects.toThrow(BambooAuthError);
  });

  it("throws BambooNetworkError when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network down"))
    );

    await expect(fetchTimeOffEntries(config)).rejects.toThrow(BambooNetworkError);
  });
});

// ---------------------------------------------------------------------------
// fetchHolidays
// ---------------------------------------------------------------------------

describe("fetchHolidays", () => {
  it("returns a normalised Holiday array on 200", async () => {
    const raw = [
      { id: 100, name: "Christmas", start: FAR_FUTURE, end: FAR_FUTURE },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(raw)));

    const holidays = await fetchHolidays(config);

    expect(holidays).toHaveLength(1);
    expect(holidays[0]).toEqual({
      id: "100",
      name: "Christmas",
      startDate: FAR_FUTURE,
      endDate: FAR_FUTURE,
    });
  });

  it("filters out holidays whose startDate is before today", async () => {
    const raw = [
      { id: 200, name: "Past Holiday", start: PAST, end: PAST },
      { id: 201, name: "Upcoming Holiday", start: FUTURE, end: FUTURE },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(raw)));

    const holidays = await fetchHolidays(config);

    expect(holidays).toHaveLength(1);
    expect(holidays[0].id).toBe("201");
  });

  it("throws BambooAuthError on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse({}, 401)));

    await expect(fetchHolidays(config)).rejects.toThrow(BambooAuthError);
  });

  it("throws BambooNetworkError when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection refused"))
    );

    await expect(fetchHolidays(config)).rejects.toThrow(BambooNetworkError);
  });
});
