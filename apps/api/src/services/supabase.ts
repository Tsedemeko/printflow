import { config } from "../config.js";

export function hasSupabaseAdmin(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!hasSupabaseAdmin()) throw new Error("Supabase admin credentials are not configured.");
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase REST ${response.status}: ${body}`);
  }
  // PostgREST writes often return an empty body (e.g. 201/204 with Prefer: return=minimal),
  // so only parse JSON when there's actually a body.
  const text = await response.text();
  return (text.length ? JSON.parse(text) : undefined) as T;
}
