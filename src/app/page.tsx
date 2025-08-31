// app/page.tsx
import LandingPage, { type UserProfile } from "./page.client";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams?: SearchParams | Promise<SearchParams> };

// Helper to support both sync and async searchParams across Next versions
async function resolveSearchParams(
  sp?: SearchParams | Promise<SearchParams>
): Promise<SearchParams> {
  return sp && typeof (sp as any).then === "function"
    ? await (sp as Promise<SearchParams>)
    : (sp ?? {});
}

export default async function Home({ searchParams }: PageProps) {
  const params = await resolveSearchParams(searchParams);

  const raw = params.a;
  const first = Array.isArray(raw) ? raw[0] : raw;
  const parsed = first ? Number(first) : NaN;
  const amount: number | undefined =
    Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

  const user: UserProfile = {
      gutokey: "zQ3shTSb9XUPVBUWfbpnuWRfeemNhjVtCFt62yz8SgxyoGNze",
  phone: "0761102203",
    name: "Marigold",
    handle: "@marigo65",
    verified: true,
  };

  return <LandingPage user={user} amount={amount} />;
}
