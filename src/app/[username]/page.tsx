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

/* ---------------- helpers ---------------- */
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
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

/** "%40sonde51" -> "@sonde51" -> "sonde51" (only a-z0-9._-) */
function normalizeHandleParam(input: string) {
  let s = safeDecode(input).trim();
  s = s.replace(/^@/i, "").replace(/^%40/i, "");
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

/** "marigo65" -> "Marigo65", "john.doe" -> "John Doe" */
function displayNameFromHandle(handle: string) {
  const spaced = handle.replace(/[_.-]+/g, " ");
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase()) || "User";
}

/** Parse ?a= amount; accepts "125000" or "125,000" */
function parseAmount(sp?: SearchParams): number | undefined {
  if (!sp) return undefined;
  const raw = Array.isArray(sp.a) ? sp.a[0] : sp.a;
  if (!raw) return undefined;
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function fetchUserPublic(handle: string) {
  const apiBase = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase || !handle) return null;

  try {
    const res = await fetch(`${apiBase}/api/profiles/by-username/${encodeURIComponent(handle)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.data ?? null;
  } catch {
    return null;
  }
}

function absoluteUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://example.com"; // <-- set this env to your real HTTPS origin
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { username } = await resolveParams(props.params);
  const sp = await resolveSearchParams(props.searchParams);

  const handle = normalizeHandleParam(username);
  const apiUser = await fetchUserPublic(handle);

  const name = apiUser?.name || displayNameFromHandle(handle);

  // read ?a= and keep digits only so 125,000 works
  const raw = Array.isArray(sp.a) ? sp.a[0] : sp.a;
  const digits = raw ? String(raw).replace(/[^\d]/g, "") : "";
  const amount = digits ? Number(digits) : undefined;
  const prettyAmount =
    amount && Number.isFinite(amount) && amount > 0
      ? new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(amount)
      : undefined;

  const title = prettyAmount
    ? `Pay ${name} • UGX ${prettyAmount}`
    : `Pay ${name} (@${handle})`;
  const description = prettyAmount
    ? `Send UGX ${prettyAmount} securely to ${name} on Guto Paylink.`
    : `Send secure payments to ${name} on Guto Paylink.`;

  const canonicalPath = `/@${handle}`;
  const imagePath = `/${encodeURIComponent("@"+handle)}/opengraph-image${
    prettyAmount ? `?a=${digits}` : ""
  }`;
  const imageAbs = absoluteUrl(imagePath);
  const canonicalAbs = absoluteUrl(canonicalPath);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },

    // Open Graph (FB/Instagram/LinkedIn/WhatsApp/Slack/Discord/etc.)
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: "Guto",
      type: "profile",
      locale: "en_US",
      images: [
        {
          url: imageAbs,          // absolute URL
          secureUrl: imageAbs,    // explicitly HTTPS
          type: "image/png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    // Twitter/X (uses same dynamic image)
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageAbs], // absolute
    },
  };
}

/* ---------------- page render ---------------- */
export default async function Page(props: PageProps) {
  const params = await resolveParams(props.params);
  const search = await resolveSearchParams(props.searchParams);

  const safeHandle = normalizeHandleParam(params.username);
  const apiBase = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  // Fallback user if API missing/404/error
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
            verified: true, // adjust if you have a real flag
          };
        }
      }
      // Non-OK/404 -> keep fallback without throwing
    } catch {
      // Network/parse error -> keep fallback
    }
  }

  const amount = parseAmount(search);
  return <LandingPage user={user} amount={amount} />;
}
