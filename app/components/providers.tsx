"use client";

import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { ReactNode, useEffect, useState } from "react";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: "443c84bd-1386-4119-8abf-3693c9640caa",
        walletConnectors: [SolanaWalletConnectors],
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
