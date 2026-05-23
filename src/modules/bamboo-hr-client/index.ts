import {
  BambooAuthError,
  BambooNetworkError,
  BambooHRConfig,
  TimeOffEntry,
  Holiday,
} from "./types";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function today(): string {
  return toISODate(new Date());
}

function oneYearFromNow(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return toISODate(d);
}

function baseUrl(subdomain: string): string {
  return `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1`;
}

function authHeader(apiKey: string): string {
  return "Basic " + Buffer.from(`${apiKey}:x`).toString("base64");
}

async function bambooFetch(url: string, config: BambooHRConfig): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: authHeader(config.apiKey),
      },
    });
  } catch (err) {
    throw new BambooNetworkError(
      err instanceof Error ? err.message : "Network request failed"
    );
  }

  if (response.status === 401) {
    throw new BambooAuthError();
  }

  return response.json();
}

export async function fetchTimeOffEntries(
  config: BambooHRConfig
): Promise<TimeOffEntry[]> {
  const todayStr = today();
  const url = `${baseUrl(config.subdomain)}/time_off/requests/?status=approved&start=${todayStr}`;

  const data = await bambooFetch(url, config);
  const items = Array.isArray(data) ? data : [];

  return items
    .map((item: Record<string, unknown>) => ({
      id: String(item.id),
      name: String(item.name),
      startDate: String(item.start),
      endDate: String(item.end),
    }))
    .filter((entry) => entry.startDate >= todayStr);
}

export async function fetchHolidays(config: BambooHRConfig): Promise<Holiday[]> {
  const todayStr = today();
  const endStr = oneYearFromNow();
  const url = `${baseUrl(config.subdomain)}/holidays/holidays/?start=${todayStr}&end=${endStr}`;

  const data = await bambooFetch(url, config);
  const items = Array.isArray(data) ? data : [];

  return items
    .map((item: Record<string, unknown>) => ({
      id: String(item.id),
      name: String(item.name),
      startDate: String(item.start),
      endDate: String(item.end),
    }))
    .filter((entry) => entry.startDate >= todayStr);
}
