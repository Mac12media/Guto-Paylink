"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import People from "./people";
import { Logo } from "./svgs";
import Form from "./form";
import Link from "next/link";
import { CheckIcon } from "lucide-react";

export type UserProfile = {
  name: string;
  gutokey: string;
  phone: string;
  handle?: string;
  avatarUrl?: string;
  verified?: boolean;
};

type PaidReceipt = {
  amount: number;
  tx: string;
  providerTx?: string | null;
  paidAtIso: string;
  payerMsisdn: string;        // normalized "2567XXXXXXXX"
  recipientMsisdn: string;    // normalized "2567XXXXXXXX"
  recipientName: string;
};

/* ───────── helpers ───────── */
function initialFrom(name: string) {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}
function normalizeHandle(handle?: string, name?: string) {
  const base =
    (handle
      ? handle.replace(/^@/, "")
      : name?.toLowerCase().trim().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "")) ||
    "user";
  return "@" + base;
}
function buildPaylink(handle: string, amount?: number) {
  const cleanHandle = handle.replace(/^@/, "");
  const url = new URL(`https://pay.guto.app/@${cleanHandle}`);
  if (amount && amount > 0) url.searchParams.set("a", String(amount));
  return url.toString();
}
function fmtDate(d: Date) {
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function encodeSVG(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
async function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  const img = new Image();
  img.decoding = "sync";
  img.src = encodeSVG(svg);
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = (e) => rej(e);
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b as Blob), "image/png"));
  return blob;
}

function truncateRef(s?: string | null, max = 15) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/** Build a white card on green background (no “To” phone; refs truncated to 15) */
function buildReceiptSVG(opts: {
  amountText: string;
  recipientName: string;
  handle: string;
  paylink: string;
  tx: string;
  providerTx?: string | null;
  paidAt: string;
  payerMsisdn: string;
  brand: { name: string; green: string };
}) {
  const {
    amountText, recipientName, handle, paylink, tx, providerTx, paidAt,
    payerMsisdn, brand
  } = opts;

  const txShort = truncateRef(tx, 15);
  const providerShort = truncateRef(providerTx ?? "", 15);


return `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${brand.green}"/>
      <stop offset="100%" stop-color="#0a8a46"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="1.2" cy="1.2" r="1.2" fill="rgba(255,255,255,0.12)"/>
    </pattern>
  </defs>

  <!-- GREEN BACKGROUND -->
  <rect width="1080" height="1080" fill="url(#g)"/>
  <rect width="1080" height="1080" fill="url(#dots)"/>
 <g transform="translate(90,120)" filter="url(#shadow)">
    <rect x="0" y="0" width="900" height="820" rx="28" fill="#ffffff" stroke="#e5e7eb"/>

    <!-- Header (no check icon) -->
    <g transform="translate(40,48)">
      <text x="0" y="38" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="40" font-weight="900" fill="#111827">Payment Receipt</text>
      <rect x="0" y="48" width="265" height="8" fill="${brand.green}" rx="4"/>
    </g>

    <!-- Amount -->
    <g transform="translate(40,150)">
      <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="28" fill="#6b7280">Amount</text>
      <text y="84" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="96" font-weight="900" fill="#111827">${amountText}</text>
    </g>

    <!-- Recipient -->
    <g transform="translate(40,320)">
      <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="28" fill="#6b7280">Recipient</text>
      <text y="46" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="44" font-weight="800" fill="#111827">${recipientName}</text>
      <text y="86" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="28" fill="#374151">${handle}</text>
    </g>

    <!-- Meta -->
    <g transform="translate(40,460)">
      <g>
        <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="24" fill="#6b7280">Paid at</text>
        <text y="36" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="30" font-weight="700" fill="#111827">${paidAt}</text>
      </g>
      <g transform="translate(420,0)">
        <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="24" fill="#6b7280">Reference</text>
        <text y="36" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="30" font-weight="700" fill="#111827">${txShort}</text>
      </g>
      ${providerShort ? `
      <g transform="translate(0,90)">
        <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="24" fill="#6b7280">Provider Ref</text>
        <text y="36" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="30" font-weight="700" fill="#111827">${providerShort}</text>
      </g>` : ``}
    </g>

    <!-- Parties (hide TO; show only FROM) -->
    <g transform="translate(40,630)">
      <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="24" fill="#6b7280">From</text>
      <text y="34" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="28" fill="#111827">+${payerMsisdn}</text>
    </g>

    <!-- Paylink -->
    <g transform="translate(40,720)">
      <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" fill="#6b7280">Paylink</text>
      <text y="30" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="26" fill="#111827">${paylink}</text>
    </g>
  </g>

  <!-- PAID badge -->
  <g transform="translate(0,0)">
    <g transform="translate(540,160) rotate(-18)">
      <rect x="-170" y="-40" width="340" height="80" rx="16" fill="#ffffff" opacity="0.18" stroke="#ffffff" stroke-width="3"/>
      <text text-anchor="middle" dominant-baseline="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="48" font-weight="900" fill="${brand.green}">PAID</text>
    </g>
  </g>

  <!-- Footer -->
  <text x="540" y="1040" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" fill="rgba(255,255,255,0.85)">Powered by ${brand.name}</text>
</svg>
`;
}


/* ───────── component ───────── */
export default function Hero({
  user,
  initialAmount,
}: {
  user: UserProfile;
  initialAmount?: number;
}) {
  const year = useMemo(() => new Date().getFullYear(), []);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const [paid, setPaid] = useState<PaidReceipt | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptPngUrl, setReceiptPngUrl] = useState<string | null>(null);

  const handle = normalizeHandle(user.handle, user.name);
  const paylink = useMemo(() => buildPaylink(handle, initialAmount), [handle, initialAmount]);

  const currency = useMemo(
    () => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }),
    []
  );

  const amountTextPrefill =
    typeof initialAmount === "number" && initialAmount > 0 ? currency.format(initialAmount) : "—";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(paylink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const el = document.createElement("textarea");
      el.value = paylink;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [paylink]);

  // Build the shareable receipt image when a real paid event arrives
  const buildingRef = useRef(false);
  useEffect(() => {
    if (!paid || buildingRef.current) return;
    buildingRef.current = true;

    const amountText = currency.format(paid.amount);
    const svg = buildReceiptSVG({
      amountText,
      recipientName: user.name,
      handle,
      paylink,
      tx: paid.tx,
      providerTx: paid.providerTx,
      paidAt: fmtDate(new Date(paid.paidAtIso)),
      payerMsisdn: paid.payerMsisdn,
      brand: { name: "Guto", green: "#009e4f" },
    });

    setReceiptPreviewUrl(encodeSVG(svg));
    svgToPngBlob(svg, 1080, 1080)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setReceiptPngUrl(url);
      })
      .finally(() => {
        buildingRef.current = false;
      });

    return () => {
      if (receiptPngUrl) URL.revokeObjectURL(receiptPngUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid]);

  const handleShareReceipt = useCallback(async () => {
    if (!receiptPngUrl) return;
    try {
      const res = await fetch(receiptPngUrl);
      const blob = await res.blob();
      const file = new File([blob], "guto-receipt.png", { type: "image/png" });
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({
          title: "Payment Receipt",
          text: "Payment completed on Guto.",
          files: [file],
        });
      } else {
        const a = document.createElement("a");
        a.href = receiptPngUrl;
        a.download = "guto-receipt.png";
        a.click();
      }
    } catch {
      const a = document.createElement("a");
      a.href = receiptPngUrl!;
      a.download = "guto-receipt.png";
      a.click();
    }
  }, [receiptPngUrl]);

  const handleDownloadReceipt = useCallback(() => {
    if (!receiptPngUrl) return;
    const a = document.createElement("a");
    a.href = receiptPngUrl;
    a.download = "guto-receipt.png";
    a.click();
  }, [receiptPngUrl]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-10">
      {/* Brand + region pill */}
      <div className="flex flex-col items-center justify-center gap-6 mb-2">
        <div className="hidden sm:block">
          <Link href="https://www.guto.app/"><Logo /></Link>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-border px-4 py-1.5 relative" aria-live="polite">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009e4f] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009e4f]" />
          </span>
          <p className="uppercase text-xs font-medium tracking-wide">available in Uganda</p>
        </div>
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center text-center gap-3 max-w-2xl">
        <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xl font-semibold" aria-label={`${user.name} avatar`}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={`${user.name} avatar`} className="h-full w-full object-cover" />
          ) : (
            initialFrom(user.name)
          )}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          {user.verified && (
            <span className="inline-flex items-center gap-1 text-primary text-sm" aria-label="Verified account">
              {/* Verified glyph retained */}
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path d="M12 2.25 14.3 4l2.7-.2 1.2 2.5 2.5 1.2-.2 2.7 1.8 2.3-1.8 2.3.2 2.7-2.5 1.2-1.2 2.5-2.7-.2L12 21.75 9.7 20l-2.7.2-1.2-2.5-2.5-1.2.2-2.7L1.7 12l1.8-2.3-.2-2.7 2.5-1.2L7 3.8l2.7.2L12 2.25Zm-1.2 12.8 5.2-5.2-1.4-1.4-3.8 3.8-1.6-1.6-1.4 1.4 3 3Z" fill="#009e4f"/>
              </svg>
              <span className="font-medium">Verified</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs">@{normalizeHandle(user.handle, user.name).replace(/^@/, "")}</span>
          <button
            onClick={useCallback(async () => {
              try {
                await navigator.clipboard.writeText(paylink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }, [paylink])}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-live="polite"
            aria-label={copied ? "Paylink copied" : "Copy paylink"}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true"><path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z" fill="currentColor"/></svg>
            {copied ? "Copied" : "Copy paylink"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          You are paying {user.name} securely. Payments are protected and your details stay private.
        </p>
      </div>

      {/* Title + dynamic subtitle */}
      <div className="flex flex-col items-center justify-center gap-2 max-w-2xl">
        {typeof initialAmount === "number" && initialAmount > 0 ? (
          <h2 className="text-4xl font-extrabold text-foreground">
            {!isSuccess ? amountTextPrefill : ""}
          </h2>
        ) : (
          <h2 className="text-2xl font-bold text-foreground">
            {!isSuccess ? `Paying ${user.name}` : ""}
          </h2>
        )}
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {!isSuccess
            ? (typeof initialAmount === "number" && initialAmount > 0
                ? "Confirm the details below to send your secure payment."
                : "Enter the amount and details below to send a secure payment.")
            : "Payment complete. Share or save your receipt below."}
        </p>
      </div>

      {/* Payment form */}
      {!isSuccess && (
        <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-card text-card-foreground shadow-sm">
            <div className="p-4 sm:p-6">
              <Form
                initialAmount={initialAmount}
                startOnAmount={!(typeof initialAmount === "number" && initialAmount > 0)}
                onSuccessChange={setIsSuccess}
                gutokey={user.gutokey}
                recipientMobile={user.phone}
                recipientName={user.name}
                country="UG"
                direction="paylink"
                onPaid={(info) => {
                  setIsSuccess(true);
                  setPaid(info);
                }}
              />
            </div>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-xs text-muted-foreground flex items-center justify-between">
              <span>© {year} Guto</span>
              <span>256-bit SSL • Secure</span>
            </div>
          </div>
        </div>
      )}

      {/* Receipt share card (outside card stays the same; header uses your logo) */}
      {isSuccess && (
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border text-white p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full  text-[#009e4f] flex items-center justify-center">
                <CheckIcon className="h-5 w-5 border-grey/40" />
              </div>
              <h3 className="text-lg font-semibold">Payment receipt</h3>
            </div>

            <div className="rounded-xl overflow-hidden ring-1 ring-white/30 bg-white">
              {receiptPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={receiptPreviewUrl} alt="Receipt preview" className="w-full h-auto" />
              ) : (
                <div className="p-12 text-center text-sm text-[#0b5e32]">Building receipt…</div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleShareReceipt}
                disabled={!receiptPngUrl}
                className="inline-flex items-center justify-center rounded-xl  bg-[#009e4f] px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Share image
              </button>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={!receiptPngUrl}
                className="inline-flex items-center justify-center rounded-xl border border-grey/40 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                Download PNG
              </button>
              {paid?.tx && (
                <span className="ml-auto text-xs text-white/90">
                  Ref: {truncateRef(paid.tx, 15)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Social proof */}
      <div className="flex items-center justify-center gap-2">
        <People count={3964} />
      </div>

      {/* Store badges */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link href="https://apps.apple.com/ug/app/guto/id6744040570">
          <img src="/appstore.png" alt="appstore" className="h-12 sm:h-14 md:h-16 w-auto object-contain" />
        </Link>
        <Link href="https://play.google.com/store/apps/details?id=com.guto.app">
          <img src="/googleplay.png" alt="googleplay" className="h-12 sm:h-14 md:h-16 w-auto object-contain" />
        </Link>
      </div>

      <span className="sr-only" aria-live="polite">{copied ? "Paylink copied to clipboard" : ""}</span>
    </div>
  );
}
