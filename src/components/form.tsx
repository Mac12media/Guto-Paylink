"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type Step = "amount" | "phone" | "account";

interface FormProps {
  onSuccessChange?: (success: boolean) => void;
  initialAmount?: number;
  startOnAmount?: boolean;
}

/** Normalize a Ugandan number to +256XXXXXXXXX */
function localToInternationalUgandan(number: string): string | null {
  const raw = number.replace(/[^+\d]/g, "");
  if (!raw) return null;
  if (/^\+256\d{9}$/.test(raw)) return raw;            // +256XXXXXXXXX
  if (/^256\d{9}$/.test(raw)) return "" + raw;        // 256XXXXXXXXX
  if (/^0\d{9}$/.test(raw)) return "256" + raw.slice(1); // 0XXXXXXXXX
  return null;
}

async function fetchGutoName(msisdn: string): Promise<string | null> {
  const international = localToInternationalUgandan(msisdn);
  if (!international) return null;

  try {
    const res = await fetch("https://api.guto.app/api/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ mobile: international }),
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

export default function Form({ onSuccessChange, initialAmount, startOnAmount }: FormProps) {
  // flow
  const startAtAmount = startOnAmount ?? !initialAmount;
  const [step, setStep] = useState<Step>(startAtAmount ? "amount" : "phone");

  // state
  const [amount, setAmount] = useState<number>(initialAmount ?? 0);
  const [phone, setPhone] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);

  const formattedAmount = useMemo(
    () => (amount > 0 ? `UGX ${amount.toLocaleString()}` : ""),
    [amount]
  );

  // handlers
  const submitAmount = (e: FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount (UGX)");
      return;
    }
    setStep("phone");
  };

  const submitPhone = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = localToInternationalUgandan(phone);
    if (!normalized) {
      toast.error("Please enter a valid Ugandan phone number");
      return;
    }

    setLoading(true);
    const fetched = await fetchGutoName(phone);
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

  // UI
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
             
              <input
                type="number"
                inputMode="numeric"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter amount"
                className="flex-grow bg-background font-bold text-lg border border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-1 transition-all duration-300 focus:outline-offset-4 focus:outline-[#009e4f]"
                required
              />
            <button
              type="submit"
              className="absolute font-semibold top-0 bottom-0 bg-[#009e4f] flex justify-center items-center cursor-pointer text-black px-5 py-2 m-2 rounded-[12px] hover:bg-opacity-90 transition-all disabled:opacity-50"
              disabled={!amount || amount <= 0}
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
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone Number"
              className="flex-grow bg-background font-bold text-lg border border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-1 transition-all duration-300 focus:outline-offset-4 focus:outline-[#009e4f]"
              disabled={loading}
              required
            />
            <button
              type="submit"
              className="absolute font-semibold top-0 bottom-0 bg-[#009e4f] flex justify-center items-center cursor-pointer text-black px-5 py-2 m-2 rounded-[12px] hover:bg-opacity-90 transition-all disabled:opacity-50"
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
            <input
              type="text"
              name="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Account Name"
              className="flex-grow bg-background border font-bold text-lg border-border text-foreground px-4 py-3 rounded-[12px] focus:outline-1 transition-all duration-300 focus:outline-offset-4 focus:outline-[#009e4f]"
              disabled={loading}
              required
            />
            <button
              type="submit"
              className="absolute font-semibold top-0 bottom-0 bg-[#009e4f] flex justify-center items-center cursor-pointer text-black px-5 py-2 m-2 rounded-[12px] hover:bg-opacity-90 transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
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
                <span>Initiate Payment</span>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Helper line under the inputs */}
      <div className="mt-2 text-xs text-muted-foreground">
        {step === "amount" && "Enter the amount you want to send."}
        {step !== "amount" && formattedAmount && `Amount: ${formattedAmount}`}
      </div>
    </div>
  );
}
