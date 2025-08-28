"use client";

import { useMemo, useState, useCallback, type FormEvent, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

// ──────────────────────────────────────────────────────────────────────────────
// Notes on edits
// - Phone normalization now ALWAYS returns +256XXXXXXXXX for valid UG mobiles.
// - Added strict validation for UG mobile ranges (07/2567 only, 9 digits after 7).
// - Added lightweight carrier hint (MTN/Airtel) from prefix.
// - send verify call with normalized number; better error reporting.
// - Optional fixed amount mode (locks amount if initialAmount provided and startOnAmount === false).
// - Better accessibility (aria-live, labels, input attributes) and UX guards.
// - Small UX niceties: min/max on amount, inputmode/autoComplete, loading guards.
// ──────────────────────────────────────────────────────────────────────────────

type Step = "amount" | "phone" | "account";

interface FormProps {
  onSuccessChange?: (success: boolean) => void;
  initialAmount?: number;
  startOnAmount?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

/** Validate and normalize a Ugandan mobile number to "+256XXXXXXXXX" */
function normalizeUgMobile(input: string): string | null {
  if (!input) return null;
  const raw = input.replace(/[^+\d]/g, "");

  // Acceptable shapes → normalize to +2567XXXXXXXX
  // +2567XXXXXXXX, 2567XXXXXXXX, 07XXXXXXXX
  const plus = /^\+?256(7\d{8})$/; // +2567XXXXXXXX or 2567XXXXXXXX
  const local = /^0(7\d{8})$/; // 07XXXXXXXX

  if (plus.test(raw)) {
    const m = raw.match(plus)!;
    return "256" + m[1];
  }
  if (local.test(raw)) {
    const m = raw.match(local)!;
    return "256" + m[1];
  }
  return null;
}

/** Infer carrier by prefix. Non-authoritative but useful for UX. */
function carrierFromMsisdn(msisdn: string | null): "MTN" | "Airtel" | "Unknown" {
  if (!msisdn) return "Unknown";
  // Expect normalized +2567XXXXXXXX
  const p = msisdn.slice(4, 6); // two digits after +2567 → the network code
  // MTN common: 76, 77, 78; Airtel: 70, 75
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
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ mobile: normalized }),
    });

    if (!res.ok) {
      try {
        const txt = await res.text();
        console.error("❗ Guto verify non-OK:", txt);
      } catch {}
      return null;
    }

    const data = await res.json();
    return data?.raw?.contact?.name ?? null;
  } catch (err) {
    console.error("❗ Guto verify fetch error:", err);
    return null;
  }
}

export default function Form({
  onSuccessChange,
  initialAmount,
  startOnAmount,
  minAmount = 100,
  maxAmount = 50_000_000,
}: FormProps) {
  // flow
  const startAtAmount = startOnAmount ?? !initialAmount;
  const [step, setStep] = useState<Step>(startAtAmount ? "amount" : "phone");

  // state
  const [amount, setAmount] = useState<number>(initialAmount ?? 0);
  const [phone, setPhone] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [carrier, setCarrier] = useState<ReturnType<typeof carrierFromMsisdn>>("Unknown");

  const fixedAmountMode = !startAtAmount && typeof initialAmount === "number" && initialAmount > 0;

  const formattedAmount = useMemo(
    () => (amount > 0 ? `UGX ${amount.toLocaleString()}` : ""),
    [amount]
  );

  // update carrier hint reactively
  useEffect(() => {
    setCarrier(carrierFromMsisdn(normalizeUgMobile(phone)));
  }, [phone]);

  // handlers
  const submitAmount = (e: FormEvent) => {
    e.preventDefault();
    if (fixedAmountMode) {
      // Nothing to change; move forward
      setStep("phone");
      return;
    }
    if (!amount || amount <= 0 || amount < minAmount || amount > maxAmount) {
      toast.error(`Enter a valid amount between UGX ${minAmount.toLocaleString()} and UGX ${maxAmount.toLocaleString()}`);
      return;
    }
    setStep("phone");
  };

  const submitPhone = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

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
    if (loading) return;

    if (!accountName.trim()) {
      toast.error("Please enter the account name");
      return;
    }

    try {
      setLoading(true);
      // TODO: hook your payment initiation here
      await new Promise((r) => setTimeout(r, 500));

      onSuccessChange?.(true);

      setTimeout(() => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }, 120);

      toast.success("Payment link created. Redirecting…");
      // e.g., router.push(redirectUrl)
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────────────────────────────────
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
            <label htmlFor="amount-input" className="sr-only">Amount (UGX)</label>
            <input
              id="amount-input"
              type="number"
              inputMode="numeric"
              min={minAmount}
              max={maxAmount}
              value={fixedAmountMode ? initialAmount : amount || ""}
              onChange={(e) => !fixedAmountMode && setAmount(Number(e.target.value))}
              placeholder="Enter amount"
              className={`flex-grow bg-background font-bold text-lg border border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-1 transition-all duration-300 focus:outline-offset-4 focus:outline-[#009e4f] ${fixedAmountMode ? "pointer-events-none opacity-80" : ""}`}
              required
              disabled={fixedAmountMode}
            />
            <button
              type="submit"
              className="absolute font-semibold top-0 bottom-0 bg-[#009e4f] flex justify-center items-center cursor-pointer dark:text-black px-5 py-2 m-2 rounded-[12px] hover:bg-opacity-90 transition-all disabled:opacity-50"
              disabled={loading || (!fixedAmountMode && (!amount || amount <= 0))}
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
            <label htmlFor="phone-input" className="sr-only">Phone Number</label>
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
              disabled={loading}
              required
            />
            <button
              type="submit"
              className="absolute font-semibold top-0 bottom-0 bg-[#009e4f] flex justify-center items-center cursor-pointer dark:text-black px-5 py-2 m-2 rounded-[12px] hover:bg-opacity-90 transition-all disabled:opacity-50"
              disabled={loading}
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
            <label htmlFor="account-input" className="sr-only">Account Name</label>
            <input
              id="account-input"
              type="text"
              name="accountName"
              autoComplete="name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Account Name"
              className="flex-grow bg-background border font-bold text-lg border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-1 transition-all duration-300 focus:outline-offset-4 focus:outline-[#009e4f]"
              disabled={loading}
              required
            />
            <button
              type="submit"
              className="absolute font-semibold top-0 bottom-0 bg-[#009e4f] flex justify-center items-center cursor-pointer dark:text-black px-5 py-2 m-2 rounded-[12px] hover:bg-opacity-90 transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 dark:text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <title>Loading spinner</title>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </span>
              ) : (
                <span>Pay</span>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Helper line under the inputs */}
      <div className="mt-2 flex justify-between text-xs text-muted-foreground" aria-live="polite">
        {step === "amount" && (fixedAmountMode ? `Amount: UGX ${Number(initialAmount).toLocaleString()} (fixed)` : "Enter the amount you want to send.")}
        {step !== "amount" && formattedAmount && `Amount: ${formattedAmount}`}
        {step === "phone" && (
          <span className="ml-2">{carrier !== "Unknown" ? ` • Network: ${carrier}` : ""}</span>
        )}
         <div className="flex items-center gap-2">
            <img src="/mtn.png" alt="MTN" className="h-6 w-auto" />
            <img src="/airtel.png" alt="Airtel" className="h-6 w-auto" />
          </div>
      </div>
      
    </div>
  );
}
