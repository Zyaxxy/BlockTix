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

const connectors = [
  SolanaWalletConnectors,
];


export function Providers({ children }: ProvidersProps) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
        walletConnectors: connectors,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}