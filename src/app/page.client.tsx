"use client";

import { useRef } from "react";

import Demo from "~/components/demo";
import Faq from "~/components/faq";
import Footer from "~/components/footer";
import Hero from "~/components/hero";
import { Confetti, ConfettiRef } from "~/components/magicui/confetti";
import Powered from "~/components/powered";

// Keep this in sync with what <Hero /> expects
export type UserProfile = {
  name: string;
  handle?: string;
  avatarUrl?: string;
  verified?: boolean;
};

type LandingPageProps = {
  user: UserProfile;     // provided by the caller
  amount?: number;       // provided by the caller (UGX)
};

export function LandingPage({ user, amount = 0 }: LandingPageProps) {
  const confettiRef = useRef<ConfettiRef>(null);

  return (
    <main className="mx-auto max-w-screen-2xl w-full h-full flex-1 flex flex-col relative">
      <Confetti
        ref={confettiRef}
        className="fixed inset-0 z-50 pointer-events-none"
        manualstart={true}
      />

      {/* Pass through values received from parent */}
      <Hero initialAmount={amount} user={user} />

      <Demo videoSrc="/demo.mp4" thumbnailSrc="/demo.png" />
      <Powered />
      <Faq />
      <Footer />
    </main>
  );
}

export default LandingPage;
