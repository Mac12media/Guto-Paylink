"use client";

import { useMemo, useState, useCallback } from "react";
import People from "./people";
import { Logo } from "./svgs";
import Form from "./form";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export type UserProfile = {
  name: string;
  handle?: string; // e.g. "jane.doe" or "@jane.doe"
  avatarUrl?: string;
  verified?: boolean; // show badge only when true
};

// ──────────────────────────────────────────────────────────────────────────────
// Tiny inline icons (no extra deps)
// ──────────────────────────────────────────────────────────────────────────────
function VerifiedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 2.25 14.3 4l2.7-.2 1.2 2.5 2.5 1.2-.2 2.7 1.8 2.3-1.8 2.3.2 2.7-2.5 1.2-1.2 2.5-2.7-.2L12 21.75 9.7 20l-2.7.2-1.2-2.5-2.5-1.2.2-2.7L1.7 12l1.8-2.3-.2-2.7 2.5-1.2L7 3.8l2.7.2L12 2.25Zm-1.2 12.8 5.2-5.2-1.4-1.4-3.8 3.8-1.6-1.6-1.4 1.4 3 3Z" fill="#009e4f"/>
    </svg>
  );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z" fill="currentColor"/>
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
  const base = (handle
    ? handle.replace(/^@/, "")
    : name?.toLowerCase().trim().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "")) || "user";
  return "@" + base;
}

function buildPaylink(handle: string, amount?: number) {
  const cleanHandle = handle.replace(/^@/, "");
  const url = new URL(`https://pay.guto.app/${cleanHandle}`);
  if (amount && amount > 0) url.searchParams.set("a", String(amount));
  return url.toString();
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

  const handle = normalizeHandle(user.handle, user.name);
  const paylink = useMemo(() => buildPaylink(handle, initialAmount), [handle, initialAmount]);

  const currency = useMemo(
    () => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }),
    []
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(paylink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
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

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-10">
      {/* Brand + region pill */}
      <div className="flex flex-col items-center justify-center gap-6 mb-2">
        <Logo />
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
          {user.verified === true && (
            <span className="inline-flex items-center gap-1 text-primary text-sm" aria-label="Verified account">
              <VerifiedIcon className="h-4 w-4" />
              <span className="font-medium">Verified</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs" aria-label="Pay handle">{handle}</span>
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
            {isSuccess ? `Payment of ${currency.format(initialAmount)} was sent` : `${currency.format(initialAmount)}`}
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

      {/* Social proof */}
      <div className="flex items-center justify-center gap-2">
        <People count={3964} />
      </div>

      {/* Hidden live region for copy status (extra SR feedback) */}
      <span className="sr-only" aria-live="polite">{copied ? "Paylink copied to clipboard" : ""}</span>
    </div>
  );
}
