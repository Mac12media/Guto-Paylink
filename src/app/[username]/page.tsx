// src/app/[username]/page.tsx
import LandingPage, { type UserProfile } from "../page.client";

export const dynamic = "force-dynamic";

type Params = { username: string };
type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = {
  params: Params | PromiseParams;
  searchParams?: SearchParams | PromiseSearchParams;
};

type PromiseParams = Promise<Params>;
type PromiseSearchParams = Promise<SearchParams>;

const isPromise = (v: unknown): v is Promise<unknown> =>
  typeof (v as any)?.then === "function";

async function resolveParams(p: Params | PromiseParams): Promise<Params> {
  return isPromise(p) ? await p : p;
}
async function resolveSearchParams(
  sp?: SearchParams | PromiseSearchParams
): Promise<SearchParams> {
  if (!sp) return {};
  return isPromise(sp) ? await sp : sp;
}

function safeDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function normalizeHandleParam(input: string) {
  // e.g. "%40sonde51" -> "@sonde51" -> "sonde51"
  let s = safeDecode(input).trim();
  s = s.replace(/^@/i, "").replace(/^%40/i, "");
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function displayNameFromHandle(handle: string) {
  const spaced = handle.replace(/[_.-]+/g, " ");
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase()) || "User";
}

export default async function Page(props: PageProps) {
  const params = await resolveParams(props.params);
  const search = await resolveSearchParams(props.searchParams);

  const safeHandle = normalizeHandleParam(params.username);
  const apiBase =
    process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  // Default fallback user (used if API is missing/404/errors)
  let user: UserProfile = {
    name: displayNameFromHandle(safeHandle),
    handle: `@${safeHandle || "user"}`,
    avatarUrl: undefined,
    verified: false,
  };

  if (apiBase && safeHandle) {
    try {
      const res = await fetch(
        `${apiBase}/api/profiles/by-username/${encodeURIComponent(safeHandle)}`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const data = json?.data;
        if (data && (data.username || data.name)) {
          user = {
            name: data.name || displayNameFromHandle(safeHandle),
            handle: `@${data.username || safeHandle}`,
            avatarUrl: data.logo || undefined,
            verified: true, // flip if you have a real flag
          };
        }
      }
      // if 404 or non-OK: keep fallback; don't throw to avoid app error boundary
    } catch {
      // network/parse error: keep fallback
    }
  }

  // ?a= amount (UGX)
  const raw = search.a;
  const first = Array.isArray(raw) ? raw[0] : raw;
  const parsed = first ? Number(first) : NaN;
  const amount: number | undefined =
    Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

  return <LandingPage user={user} amount={amount} />;
}
