import {
  BambooAuthError,
  BambooNetworkError,
  BambooHRConfig,
  EmployeeInfo,
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

interface EmployeeDirectoryResponse {
  employees: Array<{ id: number; displayName: string; workEmail: string }>;
}

export async function fetchCurrentEmployee(
  config: BambooHRConfig,
  email: string
): Promise<EmployeeInfo | null> {
  const url = `${baseUrl(config.subdomain)}/employees/directory`;
  const data = (await bambooFetch(url, config)) as EmployeeDirectoryResponse;
  const employees = data.employees ?? [];
  const match = employees.find(
    (e) => e.workEmail?.toLowerCase() === email.toLowerCase()
  );
  if (!match) return null;

  // Fetch the employee's timezone from BambooHR profile fields
  let timeZone: string | undefined;
  try {
    const fieldsUrl = `${baseUrl(config.subdomain)}/employees/${match.id}?fields=timeZone`;
    const fields = (await bambooFetch(fieldsUrl, config)) as { timeZone?: string };
    timeZone = fields.timeZone || undefined;
  } catch {
    // non-critical: sync continues without timezone
  }

  return { id: String(match.id), displayName: match.displayName, workEmail: match.workEmail, timeZone };
}

export async function validateCredentials(config: BambooHRConfig): Promise<void> {
  try {
    await fetchWhosOut(config);
  } catch (err) {
    if (err instanceof BambooAuthError) {
      throw err;
    }
    throw new BambooNetworkError(
      err instanceof Error ? err.message : "Network request failed"
    );
  }
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
