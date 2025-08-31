"use client";

import {
  useMemo,
  useState,
  useCallback,
  type FormEvent,
  useEffect,
  useRef,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type Step = "amount" | "phone" | "account";

interface FormProps {
  onSuccessChange?: (success: boolean) => void;

  /** Prefill amount (if provided and startOnAmount === false, amount is locked) */
  initialAmount?: number;
  /** If true, start on amount step even when initialAmount exists */
  startOnAmount?: boolean;

  /** Validation bounds (UGX) */
  minAmount?: number; // default 500
  maxAmount?: number; // default 50,000,000

  /** Server fields to send to /api/pay (recipient/profile side) */
  gutokey?: string;
  recipientMobile?: string;   // 07… / 2567… / +2567…
  recipientName?: string;
  country?: string;           // "UG"
  direction?: string;         // "paylink" | "deposit" etc.

  /** Optional: override status endpoint base (defaults to prod) */
  statusBaseUrl?: string;     // e.g. "https://api.guto.app/api/transactions"
}

/** Normalize a Ugandan mobile number to "2567XXXXXXXX" (12 digits, no "+") */
function normalizeUgMobile(input: string): string | null {
  if (!input) return null;
  const raw = input.replace(/[^+\d]/g, "");
  const plus = /^\+?256(7\d{8})$/;
  const local = /^0(7\d{8})$/;
  if (plus.test(raw)) return "256" + raw.match(plus)![1];
  if (local.test(raw)) return "256" + raw.match(local)![1];
  return null;
}

/** UUID v4 (uses crypto.randomUUID when available) */
function uuidv4(): string {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(b);
  } else {
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}

/** Carrier hint (non-authoritative) */
function carrierFromMsisdn(msisdn: string | null): "MTN" | "Airtel" | "Unknown" {
  if (!msisdn) return "Unknown";
  const p = msisdn.slice(4, 6);
  if (["76", "77", "78"].includes(p)) return "MTN";
  if (["70", "75"].includes(p)) return "Airtel";
  return "Unknown";
}

async function fetchGutoName(msisdn: string): Promise<string | null> {
  const normalized = normalizeUgMobile(msisdn);
  if (!normalized) return null;
  try {
    const res = await fetch("https://api.guto.app/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ mobile: normalized }),
    });
    if (!res.ok) {
      try { console.error("❗ verify non-OK:", await res.text()); } catch {}
      return null;
    }
    const data = await res.json();
    return data?.raw?.contact?.name ?? null;
  } catch (e) {
    console.error("❗ verify error:", e);
    return null;
  }
}

/** Poll the transaction status until api_status === "paid" (or failure/timeout) */
async function pollUntilPaid(opts: {
  statusUrl: string;           // full URL to GET
  intervalMs?: number;         // start interval
  maxIntervalMs?: number;      // cap interval
  timeoutMs?: number;          // global timeout
  onTick?: (s: string | undefined) => void;
  signal?: AbortSignal;
}): Promise<"paid" | "failed" | "timeout"> {
  const {
    statusUrl,
    intervalMs = 3000,
    maxIntervalMs = 7000,
    timeoutMs = 180_000,
    onTick,
    signal,
  } = opts;

  const start = Date.now();
  let backoff = intervalMs;

  const readStatus = async (): Promise<string | undefined> => {
    const res = await fetch(statusUrl, { cache: "no-store", signal });
    if (!res.ok) {
      // 404 before callback landed — just treat as pending
      if (res.status === 404) return "pending";
      // other non-OK: transient
      return undefined;
    }
    const js = await res.json().catch(() => ({} as any));
    const s =
      js?.data?.api_status ??
      js?.transaction?.api_status ??
      js?.api_status ??
      js?.status;
    return typeof s === "string" ? s.toLowerCase() : undefined;
  };

  while (Date.now() - start < timeoutMs) {
    if (signal?.aborted) return "timeout";
    let status: string | undefined;
    try {
      status = await readStatus();
    } catch {
      status = undefined; // transient
    }
    onTick?.(status);

    if (status === "paid") return "paid";
    if (status && ["failed", "cancelled", "reversed", "error"].includes(status))
      return "failed";

    await new Promise((r) => setTimeout(r, backoff));
    backoff = Math.min(backoff + 1000, maxIntervalMs);
  }
  return "timeout";
}

export default function Form({
  onSuccessChange,
  initialAmount,
  startOnAmount,
  minAmount = 500,
  maxAmount = 50_000_000,
  gutokey,
  recipientMobile,
  recipientName,
  country = "UG",
  direction = "paylink",
  statusBaseUrl = "https://api.guto.app/api/transactions",
}: FormProps) {
  const startAtAmount = startOnAmount ?? !initialAmount;
  const [step, setStep] = useState<Step>(startAtAmount ? "amount" : "phone");

  // Stable UUID for this form/session
  const txRef = useRef<string>(uuidv4());

  const [amount, setAmount] = useState<number>(initialAmount ?? 0);
  const [phone, setPhone] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [waiting, setWaiting] = useState<boolean>(false); // waiting for callback
  const [txStatus, setTxStatus] = useState<string>("pending");

  const [carrier, setCarrier] = useState<ReturnType<typeof carrierFromMsisdn>>(
    "Unknown"
  );

  const fixedAmountMode =
    !startAtAmount && typeof initialAmount === "number" && initialAmount > 0;

  const formattedAmount = useMemo(
    () => (amount > 0 ? `UGX ${amount.toLocaleString()}` : ""),
    [amount]
  );

  useEffect(() => {
    setCarrier(carrierFromMsisdn(normalizeUgMobile(phone)));
  }, [phone]);

  const submitAmount = (e: FormEvent) => {
    e.preventDefault();
    if (fixedAmountMode) return setStep("phone");
    if (!amount || amount < minAmount || amount > maxAmount) {
      toast.error(
        `Enter a valid amount between UGX ${minAmount.toLocaleString()} and UGX ${maxAmount.toLocaleString()}`
      );
      return;
    }
    setStep("phone");
  };

  const submitPhone = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || waiting) return;

    const normalized = normalizeUgMobile(phone);
    if (!normalized) {
      toast.error("Please enter a valid Ugandan mobile number (e.g. 07XXXXXXXX)");
      return;
    }

    setLoading(true);
    const fetched = await fetchGutoName(normalized);
    setLoading(false);

    if (fetched) {
      setAccountName(fetched);
      toast.success(`Found account name: ${fetched}`);
    } else {
      setAccountName("");
      toast.message("We couldn't fetch a name", { description: "You can type it manually." });
    }
    setStep("account");
  };

  const submitAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || waiting) return;

    const normalizedPayer = normalizeUgMobile(phone);
    const normalizedRecipient = recipientMobile
      ? normalizeUgMobile(recipientMobile)
      : null;

    if (!normalizedPayer) {
      toast.error("Please enter a valid Ugandan mobile number (e.g. 07XXXXXXXX)");
      return;
    }
    if (!amount || amount < minAmount) {
      toast.error(`Amount must be at least UGX ${minAmount.toLocaleString()}`);
      return;
    }
    if (!accountName.trim()) {
      toast.error("Please enter the account name");
      return;
    }
    if (!gutokey) {
      toast.error("Missing account reference (gutokey). Please try again later.");
      return;
    }
    if (!normalizedRecipient) {
      toast.error("Missing recipient number. Please try again later.");
      return;
    }

    const tx = txRef.current;

    try {
      setLoading(true);

      const payload = {
        mobile: normalizedPayer,
        amount,
        memo: `Deposit for ${gutokey}`,
        gutokey,
        recipient: normalizedRecipient,
        tx, // ← stable UUID for this session
        recipient_name: accountName || recipientName || "",
        direction,
        country,
      };

      const res = await fetch("https://api.guto.app/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `HTTP error ${res.status}`;
        try {
          msg += `: ${await res.text()}`;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json().catch(() => ({} as any));
      const munopay = (data as any)?.munopay ?? {};
      const status = String(munopay?.status ?? "unknown").toLowerCase();

      if (status !== "success") {
        const message = munopay?.message ?? "Request not accepted by gateway.";
        throw new Error(`Send failed: ${message}`);
      }

      // Move into "waiting for callback" mode — DO NOT mark success yet.
      setWaiting(true);
      setTxStatus("pending");
      toast.message("Request sent. Waiting for mobile money confirmation…", {
        description: "Approve the prompt on your phone to complete the payment.",
        duration: 5000,
      });

      // Begin polling for api_status = "paid"
      const ctrl = new AbortController();
      const statusUrl = `${statusBaseUrl.replace(/\/+$/, "")}/${encodeURIComponent(
         munopay?.transaction_id
      )}`;

      const result = await pollUntilPaid({
        statusUrl,
        intervalMs: 3000,
        maxIntervalMs: 7000,
        timeoutMs: 180_000, // 3 minutes
        signal: ctrl.signal,
        onTick: (s) => {
          if (s) setTxStatus(s);
        },
      });

      setWaiting(false);

      if (result === "paid") {
        onSuccessChange?.(true);
        toast.success("Payment confirmed!");
        setTimeout(() => {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }, 120);
      } else if (result === "failed") {
        toast.error("Payment failed. If you were charged, please contact support.");
      } else {
        toast.error("We didn’t receive a confirmation in time. You can retry.");
      }
    } catch (err: any) {
      console.error("❗ Pay error:", err);
      toast.error(err?.message || "Failed to initiate payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const disabledAll = loading || waiting;

  return (
    <div className="w-full relative">
      <AnimatePresence mode="wait">
        {step === "amount" && (
          <motion.form
            key="amount-step"
            onSubmit={submitAmount}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="flex items-stretch justify-end relative gap-2"
          >
            <label htmlFor="amount-input" className="sr-only">
              Amount (UGX)
            </label>
            <input
              id="amount-input"
              type="number"
              inputMode="numeric"
              min={minAmount}
              max={maxAmount}
              value={fixedAmountMode ? initialAmount : amount || ""}
              onChange={(e) => !fixedAmountMode && setAmount(Number(e.target.value))}
              placeholder="Enter amount"
              className={`flex-grow bg-background font-bold text-lg border border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-1 transition-all duration-300 focus:outline-offset-4 focus:outline-[#009e4f] ${
                fixedAmountMode ? "pointer-events-none opacity-80" : ""
              }`}
              required
              disabled={fixedAmountMode || disabledAll}
            />
            <button
              type="submit"
              className="absolute font-semibold top-0 bottom-0 bg-[#009e4f] flex justify-center items-center cursor-pointer text-white dark:text-black px-5 py-2 m-2 rounded-[12px] hover:bg-opacity-90 transition-all disabled:opacity-50"
              disabled={disabledAll || (!fixedAmountMode && (!amount || amount <= 0))}
            >
              Continue
            </button>
          </motion.form>
        )}

        {step === "phone" && (
          <motion.form
            key="phone-step"
            onSubmit={submitPhone}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="flex items-stretch justify-end relative"
          >
            <label htmlFor="phone-input" className="sr-only">
              Phone Number
            </label>
            <input
              id="phone-input"
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className="flex-grow bg-background font-bold text-lg border border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-1 transition-all duration-300 focus:outline-offset-4 focus:outline-[#009e4f]"
              disabled={disabledAll}
              required
            />
            <button
              type="submit"
              className="absolute font-semibold top-0 bottom-0 bg-[#009e4f] flex justify-center items-center cursor-pointer text-white dark:text-black px-5 py-2 m-2 rounded-[12px] hover:bg-opacity-90 transition-all disabled:opacity-50"
              disabled={disabledAll}
            >
              {loading ? "Checking..." : "Continue"}
            </button>
          </motion.form>
        )}

        {step === "account" && (
          <motion.form
            key="account-step"
            onSubmit={submitAccount}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="flex items-stretch justify-end relative"
          >
            <label htmlFor="account-input" className="sr-only">
              Account Name
            </label>
            <input
              id="account-input"
              type="text"
              name="accountName"
              autoComplete="name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Account Name"
              className="flex-grow bg-background border font-bold text-lg border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-1 transition-all duration-300 focus:outline-offset-4 focus:outline-[#009e4f]"
              disabled={disabledAll}
              required
            />
            <button
              type="submit"
              className="absolute font-semibold top-0 bottom-0 bg-[#009e4f] flex justify-center items-center cursor-pointer text-white dark:text-black px-5 py-2 m-2 rounded-[12px] hover:bg-opacity-90 transition-all disabled:opacity-50"
              disabled={disabledAll}
            >
              {loading || waiting ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white dark:text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <title>Loading spinner</title>
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {waiting ? "Waiting…" : "Sending..."}
                </span>
              ) : (
                <span>Pay</span>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Helper line under the inputs */}
      <div
        className="mt-2 flex flex-wrap gap-2 items-center justify-between text-xs text-muted-foreground"
        aria-live="polite"
      >
        <div className="flex-1">
          {step === "amount" &&
            (fixedAmountMode
              ? `Amount: UGX ${Number(initialAmount).toLocaleString()} (fixed)`
              : `Enter an amount between UGX ${minAmount.toLocaleString()} and UGX ${maxAmount.toLocaleString()}.`)}
          {step !== "amount" && formattedAmount && `Amount: ${formattedAmount}`}
          {waiting && (
            <span className="ml-1">
               • Status: {["pending", "approved"].includes(String(txStatus || "").toLowerCase())
 ? "waiting for approval" : txStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mtn.png" alt="MTN" className="h-5 w-auto" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/airtel.png" alt="Airtel" className="h-5 w-auto" />
        </div>
      </div>
    </div>
  );
}
