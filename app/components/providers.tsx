"use client"; 
import {
  DynamicContextProvider,
  DynamicWidget,
} from "@dynamic-labs/sdk-react-core";

import { ReactNode } from "react";

import { SolanaWalletConnectors } from "@dynamic-labs/solana";

type ProvidersProps = {
  children: ReactNode;
};


export function Providers({ children }: ProvidersProps) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: "443c84bd-1386-4119-8abf-3693c9640caa",
        walletConnectors: [SolanaWalletConnectors],
      }}>
      {children}
    </DynamicContextProvider>
  );
}
