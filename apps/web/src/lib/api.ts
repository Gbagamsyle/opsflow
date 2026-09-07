const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type TokenProvider = () => Promise<string | null>;

type ApiRequestInit = RequestInit & {
  json?: unknown;
};

export async function apiRequest<T>(
  path: string,
  getToken: TokenProvider,
  init: ApiRequestInit = {},
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated.");

  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${token}`);
  if (init.json !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    body: init.json === undefined ? init.body : JSON.stringify(init.json),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body ? body.message : null;
    throw new Error(typeof message === "string" ? message : "The API request failed.");
  }

  return body as T;
}
