// src/app/[username]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

type Props = {
  params: { username: string };
  searchParams?: Record<string, string | string[] | undefined> | URLSearchParams;
};

/* helpers */
function safeDecode(s: string) { try { return decodeURIComponent(s); } catch { return s; } }
function normalizeHandleParam(input: string) {
  let s = safeDecode(input || "").trim();
  s = s.replace(/^@/i, "").replace(/^%40/i, "");
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "");
}
function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}
function pickParam(sp: Props["searchParams"], key: string): string | undefined {
  if (!sp) return undefined;
  if (typeof (sp as URLSearchParams).get === "function") return (sp as URLSearchParams).get(key) ?? undefined;
  const v = (sp as Record<string, string | string[] | undefined>)[key];
  return Array.isArray(v) ? v[0] : v;
}
function getAmount(sp: Props["searchParams"]): number | null {
  const raw = pickParam(sp, "a") ?? pickParam(sp, "amount");
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* optional embedded heavy font (put file at src/app/[username]/_og-assets/Inter-Black.ttf) */
async function loadInterBlack(): Promise<ArrayBuffer | null> {
  try {
    const url = new URL("./_og-assets/Inter-Black.otf", import.meta.url);
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage({ params, searchParams }: Props) {
  const handle = normalizeHandleParam(params.username);
  const amount = getAmount(searchParams);
  const headline = amount ? `${fmtUGX(amount)} UGX` : `Pay @${handle || "user"}`;
  const fontSize = amount ? 176 : 148;

  const interBlack = await loadInterBlack();
  const fonts = interBlack
    ? [{ name: "InterBlack", data: interBlack, weight: 900 as const, style: "normal" as const }]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#009e4f", // ← brand green (solid)
          position: "relative",
          color: "#fff",
          fontFamily: interBlack
            ? 'InterBlack, "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial'
            : 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
        }}
      >
        {/* soft highlight for depth (keeps brand color but adds subtle light) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(780px 320px at 50% 58%, rgba(255,255,255,0.14), transparent 60%)",
          }}
        />

        {/* headline */}
        <div
          style={{
            zIndex: 1,
            fontSize,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.06,
            textAlign: "center",
            padding: "0 56px",
            textShadow: "0 6px 18px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.25)",
        }}
        >
          {headline}
        </div>

        {/* tiny brand footer */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: "rgba(255,255,255,0.95)",
            fontSize: 28,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#ffffff",
              boxShadow: "0 0 10px rgba(255,255,255,0.9)",
            }}
          />
          Guto Paylink
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
