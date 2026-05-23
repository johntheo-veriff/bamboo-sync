import {
  BambooAuthError,
  BambooNetworkError,
  BambooHRConfig,
  WhosOutEntry,
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

interface WhosOutApiItem {
  id: number;
  type: "timeOff" | "holiday";
  name: string;
  start: string;
  end: string;
}

export async function fetchWhosOut(config: BambooHRConfig): Promise<WhosOutEntry[]> {
  const todayStr = today();
  const endStr = oneYearFromNow();
  const url = `${baseUrl(config.subdomain)}/time_off/whos_out?start=${todayStr}&end=${endStr}`;

  const data = await bambooFetch(url, config);
  const items: WhosOutApiItem[] = Array.isArray(data) ? (data as WhosOutApiItem[]) : [];

  return items
    .map((item) => ({
      id: String(item.id),
      type: item.type === "timeOff" ? ("time-off" as const) : ("holiday" as const),
      name: item.name,
      startDate: item.start,
      endDate: item.end,
    }))
    .filter((entry) => entry.startDate >= todayStr);
}
