// src/app/[username]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "nodejs";          // keep nodejs while debugging; switch to "edge" later
export const contentType = "image/png";

type Props = { params: { username: string }; searchParams?: any };

/* ---------- helpers ---------- */
function safeDecode(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}
function normalizeHandleParam(input: string) {
  let s = safeDecode(input || "").trim();
  s = s.replace(/^@/i, "").replace(/^%40/i, "");
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "");
}
function fmtUGX(n: number) {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}
function getAmount(sp: any): number | null {
  if (!sp) return null;

  // Works whether searchParams is a plain object or URLSearchParams
  let raw: string | undefined;
  if (typeof sp.get === "function") {
    raw = sp.get("a") ?? sp.get("amount") ?? undefined;
  } else {
    const v = sp.a ?? sp.amount;
    raw = Array.isArray(v) ? v[0] : v;
  }
  if (!raw) return null;

  // allow "125,000" or "125000"
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return null;

  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ---------- OPTIONAL: embed a real black font ----------
   1) drop a font file, e.g. /public/fonts/Inter-Black.ttf
   2) uncomment the code below and pass `fonts` in ImageResponse options

async function loadFont() {
  const url = new URL("../../public/fonts/Inter-Black.ttf", import.meta.url);
  const res = await fetch(url);
  return await res.arrayBuffer();
}
--------------------------------------------------------- */

export default function OpengraphImage({ params, searchParams }: Props) {
  try {
    const handle = normalizeHandleParam(params.username);
    const amount = getAmount(searchParams);
    const headline = amount ? `${fmtUGX(amount)} UGX` : `Pay @${handle || "user"}`;

    // Bigger for amounts
    const fontSize = amount ? 170 : 140;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // transparent canvas
            backgroundColor: "transparent",
            color: "#000",
            fontFamily: "system-ui, Segoe UI, Arial",
            position: "relative",
          }}
        >
          {/* Heavy text with faux-stroke via multiple shadows */}
          <div
            style={{
              fontSize,
              fontWeight: 900,                 // real bold if available
              letterSpacing: -2,
              lineHeight: 1.05,
              textAlign: "center",
              // multi-shadow makes it look bolder even without Black font installed
              textShadow: `
                0 0 0 #000,
                0.7px 0 #000, -0.7px 0 #000,
                0 0.7px #000, 0 -0.7px #000,
                0.7px 0.7px #000, -0.7px 0.7px #000,
                0.7px -0.7px #000, -0.7px -0.7px #000
              `,
            }}
          >
            {headline}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        /* If embedding a font, pass it here:
        fonts: [
          {
            name: "InterBlack",
            data: await loadFont(),
            weight: 900,
            style: "normal",
          },
        ],
        */
      }
    );
  } catch {
    // Always return a valid transparent PNG even on error
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            color: "#000",
            fontFamily: "system-ui, Segoe UI, Arial",
            fontSize: 72,
            fontWeight: 900,
          }}
        >
          OG
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
