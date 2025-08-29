"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import People from "./people";
import { Logo } from "./svgs";
import Form from "./form";

export type UserProfile = {
  name: string;
  handle?: string; // e.g. "jane.doe" or "@jane.doe"
  avatarUrl?: string;
  verified?: boolean;
};

// ──────────────────────────────────────────────────────────────────────────────
// Tiny inline icons (no extra deps)
// ──────────────────────────────────────────────────────────────────────────────
function VerifiedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M12 2.25 14.3 4l2.7-.2 1.2 2.5 2.5 1.2-.2 2.7 1.8 2.3-1.8 2.3.2 2.7-2.5 1.2-1.2 2.5-2.7-.2L12 21.75 9.7 20l-2.7.2-1.2-2.5-2.5-1.2.2-2.7L1.7 12l1.8-2.3-.2-2.7 2.5-1.2L7 3.8l2.7.2L12 2.25Zm-1.2 12.8 5.2-5.2-1.4-1.4-3.8 3.8-1.6-1.6-1.4 1.4 3 3Z"
        fill="#009e4f"
      />
    </svg>
  );
}
function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"
        fill="currentColor"
      />
    </svg>
  );
}
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
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
function shortRef() {
  // lightweight client ref (not a real txn id)
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString().slice(-4);
  return `G-${rand}${time}`;
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
  // Transparent background; draw white if you prefer opaque:
  // ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b as Blob), "image/png")
  );
  return blob;
}

// Build a nice-looking SVG receipt (1080x1080, share-friendly)
function buildReceiptSVG(opts: {
  brand: { name: string; accent: string };
  amountText: string;
  recipientName: string;
  recipientHandle: string;
  reference: string;
  paidAt: string;
  paylink: string;
}) {
  const { brand, amountText, recipientName, recipientHandle, reference, paidAt, paylink } = opts;

  return `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f6f9f7"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="rgba(0,0,0,0.12)"/>
    </filter>
  </defs>

  <rect width="1080" height="1080" fill="url(#bg)"/>
  <g transform="translate(80, 120)">

    <!-- Header -->
    <g>
      <circle cx="28" cy="28" r="28" fill="${brand.accent}" />
      <path d="M22 28 l8 8 l16 -16" stroke="#000" stroke-width="5" fill="none" />
      <text x="70" y="36" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="38" font-weight="800" fill="#000">
        ${brand.name} Payment Receipt
      </text>
    </g>

    <!-- Card -->
    <g transform="translate(0, 80)" filter="url(#shadow)">
      <rect x="0" y="0" rx="32" ry="32" width="920" height="740" fill="#ffffff" stroke="#e5e7eb"/>
      <g transform="translate(40,40)">
        <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="28" font-weight="700" fill="#111827">Payment Successful</text>
        <rect x="0" y="52" width="120" height="8" fill="${brand.accent}" rx="4"/>

        <!-- Amount -->
        <g transform="translate(0,120)">
          <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="24" fill="#6b7280">Amount</text>
          <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="80" font-weight="900" fill="#000000" y="82">${amountText}</text>
        </g>

        <!-- Recipient -->
        <g transform="translate(0,260)">
          <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="24" fill="#6b7280">Recipient</text>
          <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="40" font-weight="800" fill="#111827" y="44">${recipientName}</text>
          <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="26" fill="#6b7280" y="86">${recipientHandle}</text>
        </g>

        <!-- Meta row -->
        <g transform="translate(0,380)">
          <g>
            <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" fill="#6b7280">Reference</text>
            <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="30" font-weight="700" fill="#111827" y="36">${reference}</text>
          </g>
          <g transform="translate(360,0)">
            <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" fill="#6b7280">Paid at</text>
            <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="30" font-weight="700" fill="#111827" y="36">${paidAt}</text>
          </g>
        </g>

        <!-- Paylink -->
        <g transform="translate(0,520)">
          <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" fill="#6b7280">Paylink</text>
          <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="28" fill="#111827" y="32">${paylink}</text>
        </g>

        <!-- Footer -->
        <g transform="translate(0,640)">
          <text font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="20" fill="#6b7280">Powered by ${brand.name}</text>
        </g>
      </g>
    </g>
  </g>
</svg>
`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
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

  // Shareable receipt state
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null); // data: URL (SVG)
  const [receiptPngUrl, setReceiptPngUrl] = useState<string | null>(null); // object URL (PNG)
  const [reference, setReference] = useState<string | null>(null);

  const handle = normalizeHandle(user.handle, user.name);
  const paylink = useMemo(() => buildPaylink(handle, initialAmount), [handle, initialAmount]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-UG", {
        style: "currency",
        currency: "UGX",
        maximumFractionDigits: 0,
      }),
    []
  );

  const amountText =
    typeof initialAmount === "number" && initialAmount > 0
      ? currency.format(initialAmount)
      : "—";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(paylink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
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
      } catch {}
    }
  }, [paylink]);

  // Build receipt preview & PNG after success
  const buildingRef = useRef(false);
  useEffect(() => {
    if (!isSuccess || buildingRef.current) return;
    buildingRef.current = true;

    const ref = shortRef();
    setReference(ref);

    const svg = buildReceiptSVG({
      brand: { name: "Guto", accent: "#009e4f" },
      amountText,
      recipientName: user.name,
      recipientHandle: handle,
      reference: ref,
      paidAt: fmtDate(new Date()),
      paylink,
    });

    setReceiptPreviewUrl(encodeSVG(svg));

    // also create a PNG for sharing/downloading
    svgToPngBlob(svg, 1080, 1080)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setReceiptPngUrl(url);
      })
      .catch(() => {
        setReceiptPngUrl(null);
      })
      .finally(() => {
        buildingRef.current = false;
      });

    return () => {
      if (receiptPngUrl) URL.revokeObjectURL(receiptPngUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, amountText, user.name, handle, paylink]);

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
        // Fallback: trigger download
        const a = document.createElement("a");
        a.href = receiptPngUrl;
        a.download = "guto-receipt.png";
        a.click();
      }
    } catch {
      // Fallback: download
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
          <Logo />
        </div>
        <div
          className="flex items-center gap-3 rounded-full border border-border px-4 py-1.5 relative"
          aria-live="polite"
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009e4f] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009e4f]" />
          </span>
          <p className="uppercase text-xs font-medium tracking-wide">
            available in Uganda
          </p>
        </div>
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center text-center gap-3 max-w-2xl">
        <div
          className="h-20 w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xl font-semibold"
          aria-label={`${user.name} avatar`}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={`${user.name} avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            initialFrom(user.name)
          )}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          {user.verified === true && (
            <span
              className="inline-flex items-center gap-1 text-primary text-sm"
              aria-label="Verified account"
            >
              <VerifiedIcon className="h-4 w-4" />
              <span className="font-medium">Verified</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs" aria-label="Pay handle">
            {handle}
          </span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-live="polite"
            aria-label={copied ? "Paylink copied" : "Copy paylink"}
          >
            <CopyIcon className="h-3.5 w-3.5" />
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
            {isSuccess
              ?  <div className="w-full max-w-xl">
          <div className="rounded-2xl border bg-white/70 dark:bg-neutral-950/70 backdrop-blur p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-[#009e4f] text-black flex items-center justify-center">
                <CheckIcon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Payment receipt ready</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Share or save this image as your receipt. It includes the amount, recipient,
              time, and a reference.
            </p>

            <div className="rounded-xl border bg-background overflow-hidden">
              {/* Live preview (SVG or PNG) */}
              {receiptPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receiptPreviewUrl}
                  alt="Receipt preview"
                  className="w-full h-auto"
                />
              ) : (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  Generating receipt…
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleShareReceipt}
                disabled={!receiptPngUrl}
                className="inline-flex items-center justify-center rounded-xl bg-[#009e4f] text-black px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Share image
              </button>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={!receiptPngUrl}
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                Download PNG
              </button>
              {reference && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Ref: {reference}
                </span>
              )}
            </div>
          </div>
        </div>
              : `${amountText}`}
          </h2>
        ) : (
          <h2 className="text-2xl font-bold text-foreground">
            {isSuccess ? `Payment was sent to ${user.name}` : `Paying ${user.name}`}
          </h2>
        )}
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {isSuccess
            ? "You've successfully sent a payment. We’ll notify the recipient and share a receipt with you."
            : typeof initialAmount === "number" && initialAmount > 0
            ? "Confirm the details below to send your secure payment."
            : "Enter the amount and details below to send a secure payment."}
        </p>
      </div>

      {/* Payment form */}
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="p-4 sm:p-6">
            <Form
              initialAmount={initialAmount}
              startOnAmount={!(typeof initialAmount === "number" && initialAmount > 0)}
              onSuccessChange={setIsSuccess}
            />
          </div>
          <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-xs text-muted-foreground flex items-center justify-between">
            <span>© {year} Guto</span>
            <span>256-bit SSL • Secure</span>
          </div>
        </div>
      </div>

      {/* Receipt share block (shown after success) */}


      {/* Social proof */}
      <div className="flex items-center justify-center gap-2">
        <People count={3964} />
      </div>

      {/* Store badges (responsive) */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <img
          src="/appstore.png"
          alt="appstore"
          className="h-12 sm:h-14 md:h-16 w-auto object-contain"
        />
        <img
          src="/googleplay.png"
          alt="googleplay"
          className="h-12 sm:h-14 md:h-16 w-auto object-contain"
        />
      </div>

      {/* Hidden live region for copy status (extra SR feedback) */}
      <span className="sr-only" aria-live="polite">
        {copied ? "Paylink copied to clipboard" : ""}
      </span>
    </div>
  );
}
