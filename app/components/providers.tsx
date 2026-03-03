"use client"; 
// import { SolanaProvider } 
// from "@solana/react-hooks"; import { PropsWithChildren } 
// from "react"; import { autoDiscover, createClient } 
// from "@solana/client"; 
// const client = createClient({ endpoint: "https://api.devnet.solana.com", walletConnectors: autoDiscover(), }); 
// export function Providers({ children }: PropsWithChildren) 
// {
//    return <SolanaProvider client={client}>{children}</SolanaProvider>;
   
//   }
  
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
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
