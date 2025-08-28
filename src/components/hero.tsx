"use client";

import { useMemo, useState } from "react";
import People from "./people";
import { Logo } from "./svgs";
import Form from "./form";

type UserProfile = {
  name: string;
  handle?: string;      // e.g. "jane.doe" or "@jane.doe"
  avatarUrl?: string;
  verified?: boolean;
};

// tiny inline icons so we don't add dependencies
function VerifiedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 2.25 14.3 4l2.7-.2 1.2 2.5 2.5 1.2-.2 2.7 1.8 2.3-1.8 2.3.2 2.7-2.5 1.2-1.2 2.5-2.7-.2L12 21.75 9.7 20l-2.7.2-1.2-2.5-2.5-1.2.2-2.7L1.7 12l1.8-2.3-.2-2.7 2.5-1.2L7 3.8l2.7.2L12 2.25Zm-1.2 12.8 5.2-5.2-1.4-1.4-3.8 3.8-1.6-1.6-1.4 1.4 3 3Z" fill="currentColor"/>
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

function initialFrom(name: string) {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}

function normalizeHandle(handle?: string, name?: string) {
  const base =
    (handle ? handle.replace(/^@/, "") : name?.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "")) ||
    "user";
  return "@" + base;
}

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
  const paylink = `https://pay.guto.app/${handle}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paylink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-10">
      {/* Brand + region pill */}
      <div className="flex flex-col items-center justify-center gap-6 mb-2">
        <Logo />
        <div className="flex items-center gap-3 rounded-full border border-border px-4 py-1.5 relative">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009e4f] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009e4f]" />
          </span>
          <p className="uppercase text-xs font-medium tracking-wide">available in Uganda</p>
        </div>
      </div>

      {/* Profile header (ALWAYS from imported user info) */}
      <div className="flex flex-col items-center text-center gap-3 max-w-2xl">
        <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xl font-semibold">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            initialFrom(user.name)
          )}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          {user.verified !== false && (
            <span className="inline-flex items-center gap-1 text-primary text-sm">
              <VerifiedIcon className="h-4 w-4" />
              <span className="font-medium">Verified</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs">{handle}</span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
        {initialAmount ? (
          <h2 className="text-4xl font-extrabold text-foreground">
            {isSuccess ? `Payment of UGX ${initialAmount.toLocaleString()} was sent` : `UGX ${initialAmount.toLocaleString()}`}
          </h2>
        ) : (
          <h2 className="text-2xl font-bold text-foreground">
            {isSuccess ? `Payment was sent to ${user.name}` : `Paying ${user.name}`}
          </h2>
        )}
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {isSuccess
            ? "You've successfully sent a payment. We’ll notify the recipient and share a receipt with you."
            : initialAmount
            ? "Confirm the details below to send your secure payment."
            : "Enter the amount and details below to send a secure payment."}
        </p>
      </div>

      {/* Payment form */}
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="p-4 sm:p-6">
            <Form initialAmount={initialAmount} startOnAmount={!initialAmount} onSuccessChange={setIsSuccess} />
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
    </div>
  );
}
