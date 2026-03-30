"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { ReactNode } from "react";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";

type ProvidersProps = {
  children: ReactNode;
};

// custom styling overrides for Dynamic UI
const cssOverrides = `
  .dynamic-overlay {
    backdrop-filter: blur(14px) !important;
    background: rgba(0, 0, 0, 0.4) !important;
  }

  
  .dynamic-modal,
  .modal-container {
    background: linear-gradient(
      135deg,
      rgba(255,255,255,0.08),
      rgba(255,255,255,0.02)
    ) !important;

    backdrop-filter: blur(28px) saturate(180%) !important;

    border: 1px solid rgba(255,255,255,0.14) !important;
    border-radius: 28px !important;

    box-shadow:
      0 10px 40px rgba(0,0,0,0.5),
      inset 0 1px rgba(255,255,255,0.15) !important;
  }

  
  [data-testid="email-input"] input::placeholder,
[data-testid="auth-email-input"] input::placeholder {
  opacity: 0 !important;
  color: transparent !important;
}

  
  input {
    background: transparent !important;
  color: #ffffff !important;
  padding-top: 18px !important;
  }

  input::placeholder {
  opacity: 0 !important;
  }

  input:focus {
    outline: none !important;
  }

  
  [data-testid="primary-button"] {
    background: rgba(255,255,255,0.12) !important;
    color: #ffffff !important;
    border: 1px solid rgba(255,255,255,0.35) !important;
    backdrop-filter: blur(12px) !important;
    border-radius: 999px !important;
    font-weight: 600 !important;
  }

  
  [data-testid="primary-button"][data-state="active"] {
    background: rgba(255,255,255,0.18) !important;
    color: #ffffff !important;
  }

  
  [data-testid="primary-button"]:hover {
    background: rgba(255,255,255,0.22) !important;
    border: 1px solid rgba(255,255,255,0.45) !important;
    transform: scale(1.03);
  }

  
  [data-testid="primary-button"]:disabled {
    opacity: 0.4 !important;
    cursor: not-allowed !important;
  }

  
  button[aria-label="Continue with Google"] {
    background: rgba(255,255,255,0.08) !important;
    color: #ffffff !important;
    border: 1px solid rgba(255,255,255,0.25) !important;
    border-radius: 999px !important;
  }

  
  .wallet-list-item__tile {
    background: linear-gradient(
      135deg,
      rgba(255,255,255,0.06),
      rgba(255,255,255,0.01)
    ) !important;

    backdrop-filter: blur(16px) !important;

    border: 1px solid rgba(255,255,255,0.12) !important;
    border-radius: 16px !important;

    transition: all 0.25s ease;
  }

  .wallet-list-item__tile:hover {
    transform: scale(1.02);
    background: rgba(255,255,255,0.1) !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
  }

  
  h1, h2, h3, label {
    color: #ffffff !important;
    letter-spacing: 0.5px;
  }

  
  .dynamic-footer {
    background: transparent !important;
    color: rgba(255,255,255,0.4) !important;
  }

  
  .dynamic-modal {
    animation: glassPop 0.35s ease;
  }

  @keyframes glassPop {
    from {
      opacity: 0;
      transform: scale(0.92) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (max-width: 768px) {
  .dynamic-overlay {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 16px !important; /* prevents edge sticking */
  }

  .dynamic-modal,
  .modal-container {
    margin: 0 auto !important;
    width: 100% !important;
    max-width: 420px !important;
  }
}
`;

export function Providers({ children }: ProvidersProps) {
  return (
    <DynamicContextProvider
      theme="dark"
      settings={{
        // only  environmentId across the app
        environmentId: "443c84bd-1386-4119-8abf-3693c9640caa",

        // Solana wallet connectors
        walletConnectors: [SolanaWalletConnectors],

        // Custom UI styling
        cssOverrides,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}