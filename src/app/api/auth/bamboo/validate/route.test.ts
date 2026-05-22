import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { BambooAuthError } from "@/modules/bamboo-hr-client/types";

vi.mock("@/modules/bamboo-hr-client", () => ({
  fetchTimeOffEntries: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    })
  ),
}));

import { fetchTimeOffEntries } from "@/modules/bamboo-hr-client";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/bamboo/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/bamboo/validate", () => {
  it("returns 200 when BambooHR credentials are valid", async () => {
    vi.mocked(fetchTimeOffEntries).mockResolvedValue([]);

    const res = await POST(makeRequest({ subdomain: "acme", apiKey: "valid-key" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
  });

  it("returns 401 when API key is invalid", async () => {
    vi.mocked(fetchTimeOffEntries).mockRejectedValue(new BambooAuthError());

    const res = await POST(makeRequest({ subdomain: "acme", apiKey: "bad-key" }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when subdomain is missing", async () => {
    const res = await POST(makeRequest({ apiKey: "key" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when apiKey is missing", async () => {
    const res = await POST(makeRequest({ subdomain: "acme" }));
    expect(res.status).toBe(400);
  });

  it("returns 502 when BambooHR is unreachable", async () => {
    vi.mocked(fetchTimeOffEntries).mockRejectedValue(new Error("Network error"));

    const res = await POST(makeRequest({ subdomain: "acme", apiKey: "key" }));
    expect(res.status).toBe(502);
  });
});
