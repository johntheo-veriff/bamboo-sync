import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWhosOut } from "./index";
import { BambooAuthError, BambooNetworkError, BambooHRConfig } from "./types";

const config: BambooHRConfig = { subdomain: "acme", apiKey: "test-key" };

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
  vi.useFakeTimers();
  vi.setSystemTime(new Date(TODAY));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("fetchWhosOut", () => {
  it("returns time-off and holiday entries normalised", async () => {
    const raw = [
      { id: 1, type: "timeOff", name: "Alice", start: FUTURE, end: "2026-07-05" },
      { id: 427, type: "holiday", name: "Whit Monday", start: FUTURE, end: FUTURE },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(raw)));

    const entries = await fetchWhosOut(config);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ id: "1", type: "time-off", name: "Alice", startDate: FUTURE, endDate: "2026-07-05" });
    expect(entries[1]).toEqual({ id: "427", type: "holiday", name: "Whit Monday", startDate: FUTURE, endDate: FUTURE });
  });

  it("maps API type 'timeOff' to 'time-off' and 'holiday' stays 'holiday'", async () => {
    const raw = [
      { id: 10, type: "timeOff", name: "Bob", start: TODAY, end: TODAY },
      { id: 11, type: "holiday", name: "New Year", start: FAR_FUTURE, end: FAR_FUTURE },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(raw)));

    const entries = await fetchWhosOut(config);

    expect(entries.find((e) => e.id === "10")?.type).toBe("time-off");
    expect(entries.find((e) => e.id === "11")?.type).toBe("holiday");
  });

  it("filters out entries whose startDate is before today", async () => {
    const raw = [
      { id: 20, type: "timeOff", name: "Old", start: PAST, end: PAST },
      { id: 21, type: "timeOff", name: "Future", start: FUTURE, end: FUTURE },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(raw)));

    const entries = await fetchWhosOut(config);

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("21");
  });

  it("returns empty array when API returns empty list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse([])));

    const entries = await fetchWhosOut(config);

    expect(entries).toEqual([]);
  });

  it("throws BambooAuthError on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse({}, 401)));

    await expect(fetchWhosOut(config)).rejects.toThrow(BambooAuthError);
  });

  it("throws BambooNetworkError when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network down")));

    await expect(fetchWhosOut(config)).rejects.toThrow(BambooNetworkError);
  });
});
