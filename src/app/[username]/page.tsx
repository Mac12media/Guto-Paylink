// src/app/[username]/page.tsx
import type { Metadata } from "next";
import LandingPage, { type UserProfile } from "../page.client";

export const dynamic = "force-dynamic";

type Params = { username: string };
type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = {
  params: Params | Promise<Params>;
  searchParams?: SearchParams | Promise<SearchParams>;
};

const isPromise = (v: unknown): v is Promise<unknown> =>
  typeof (v as any)?.then === "function";

async function resolveParams(p: Params | Promise<Params>): Promise<Params> {
  return isPromise(p) ? await p : p;
}
async function resolveSearchParams(
  sp?: SearchParams | Promise<SearchParams>
): Promise<SearchParams> {
  if (!sp) return {};
  return isPromise(sp) ? await sp : sp;
}

function safeDecode(input: string): string {
  try { return decodeURIComponent(input); } catch { return input; }
}
function normalizeHandleParam(input: string) {
  // "%40sonde51" -> "@sonde51" -> "sonde51"
  let s = safeDecode(input).trim();
  s = s.replace(/^@/i, "").replace(/^%40/i, "");
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "");
}
function displayNameFromHandle(handle: string) {
  const spaced = handle.replace(/[_.-]+/g, " ");
  return spaced.replace(/\b\w/g, c => c.toUpperCase()) || "User";
}

async function fetchUserForSEO(handle: string) {
  const apiBase = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase || !handle) return null;

  try {
    const res = await fetch(
      `${apiBase}/api/profiles/by-username/${encodeURIComponent(handle)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/* ---------- DYNAMIC SEO HERE ---------- */
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { username } = await resolveParams(props.params);
  const sp = await resolveSearchParams(props.searchParams);

  const handle = normalizeHandleParam(username);
  const apiUser = await fetchUserForSEO(handle);

  const name = apiUser?.name || displayNameFromHandle(handle);
  const avatar = apiUser?.logo as string | undefined;

  
  // Optional: include amount from ?a= in the SEO
  const raw = sp.a;
  const first = Array.isArray(raw) ? raw[0] : raw;
  const parsed = first ? Number(first) : NaN;
  const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

  const title = amount
    ? `Pay ${name} • UGX ${amount.toLocaleString()}`
    : `Pay ${name} (@${handle})`;

  const description = amount
    ? `Send UGX ${amount.toLocaleString()} securely to ${name} on Paylink.`
    : `Send secure payments to ${name} on Paylink.`;

  const canonicalPath = `/@${handle}`;

  // inside generateMetadata(...)
const imagePath = `/${encodeURIComponent("@"+handle)}/opengraph-image${
  amount ? `?a=${amount}` : ""
}`;

return {
  title,
  description,
  alternates: { canonical: `/@${handle}` },
  openGraph: {
    title,
    description,
    url: `/@${handle}`,
    siteName: "Guto",
    type: "profile",
    images: [{ url: imagePath, width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [imagePath],
  },
};

}

/* ---------- PAGE RENDER (unchanged) ---------- */
export default async function Page(props: PageProps) {
  const params = await resolveParams(props.params);
  const search = await resolveSearchParams(props.searchParams);

  const safeHandle = normalizeHandleParam(params.username);
  const apiBase = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

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
            verified: true,
          };
        }
      }
    } catch {}
  }

  const raw = search.a;
  const first = Array.isArray(raw) ? raw[0] : raw;
  const parsed = first ? Number(first) : NaN;
  const amount: number | undefined =
    Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

  return <LandingPage user={user} amount={amount} />;
}
