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
  const dynamicEnvironmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID?.trim();

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

  if (!dynamicEnvironmentId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-xl rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-white/85">
          Dynamic is not configured. Set `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` in your `.env` and restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <DynamicContextProvider
      theme="dark"
      settings={{
        environmentId: dynamicEnvironmentId,
        walletConnectors: [SolanaWalletConnectors],
        cssOverrides: `
          :root {
            --dynamic-border-radius: 20px;
            --dynamic-base-1: rgba(255, 255, 255, 0.02);
            --dynamic-base-2: rgba(255, 255, 255, 0.02);
            --dynamic-base-3: rgba(255, 255, 255, 0.08);
            --dynamic-base-4: rgba(255, 255, 255, 0.18);
            --dynamic-hover: rgba(255, 255, 255, 0.14);
            --dynamic-text-primary: #ffffff;
            --dynamic-text-secondary: rgba(255, 255, 255, 0.8);
            --dynamic-text-tertiary: rgba(255, 255, 255, 0.62);
            --dynamic-text-link: #ffffff;
            --dynamic-brand-primary-color: rgba(255, 255, 255, 0.14);
            --dynamic-button-primary-background: rgba(255, 255, 255, 0.14);
            --dynamic-button-secondary-background: rgba(255, 255, 255, 0.09);
            --dynamic-button-primary-border: 1px solid rgba(255, 255, 255, 0.16);
            --dynamic-button-secondary-border: 1px solid rgba(255, 255, 255, 0.14);
            --dynamic-shadow-down-1:
              4px 4px 4px rgba(0, 0, 0, 0.05),
              inset 0 1px 1px rgba(255, 255, 255, 0.15);
            --dynamic-shadow-down-2:
              4px 4px 4px rgba(0, 0, 0, 0.05),
              inset 0 1px 1px rgba(255, 255, 255, 0.15);
            --dynamic-shadow-down-3:
              4px 4px 4px rgba(0, 0, 0, 0.05),
              inset 0 1px 1px rgba(255, 255, 255, 0.15);
          }

          .modal-card,
          [data-testid="dynamic-auth-modal"] {
            position: relative;
            border: 0 !important;
            background: rgba(255, 255, 255, 0.02) !important;
            background-blend-mode: luminosity;
            backdrop-filter: blur(50px) !important;
            -webkit-backdrop-filter: blur(50px) !important;
            box-shadow:
              4px 4px 4px rgba(0, 0, 0, 0.05),
              inset 0 1px 1px rgba(255, 255, 255, 0.15) !important;
          }

          .modal-card::before,
          [data-testid="dynamic-auth-modal"]::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            padding: 1.4px;
            background: linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.6) 0%,
              rgba(255, 255, 255, 0.14) 48%,
              rgba(255, 255, 255, 0.14) 52%,
              rgba(255, 255, 255, 0.6) 100%
            );
            -webkit-mask:
              linear-gradient(#fff 0 0) content-box,
              linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask:
              linear-gradient(#fff 0 0) content-box,
              linear-gradient(#fff 0 0);
            mask-composite: exclude;
            pointer-events: none;
          }

          .modal-header,
          .layout-header,
          .dynamic-footer {
            border-color: rgba(255, 255, 255, 0.16) !important;
          }

          .login-view__container {
            padding: 0.95rem !important;
          }

          .login-view__scroll {
            gap: 0.55rem !important;
            max-height: none !important;
            padding-bottom: 0.2rem;
          }

          .login-view__scroll__section--emailAndPhone,
          .login-view__scroll__section--social,
          .login-view__scroll__section--wallets {
            display: flex;
            flex-direction: column;
            gap: 0.45rem !important;
          }

          .login-view__scroll__section--emailAndPhone + .login-view__scroll__section--social {
            margin-top: 0.25rem !important;
          }

          .login-view__scroll .divider {
            margin: 0.2rem 0 !important;
          }

          .login-view__scroll .divider .typography {
            font-size: 0.72rem !important;
            line-height: 1.1 !important;
            letter-spacing: 0.08em;
          }

          .button,
          .list-tile,
          .social-sign-in--tile,
          .wallet-list-item__tile {
            border-radius: 14px !important;
            border: 1px solid rgba(255, 255, 255, 0.14) !important;
            background: rgba(255, 255, 255, 0.02) !important;
            background-blend-mode: luminosity;
            backdrop-filter: blur(50px) !important;
            -webkit-backdrop-filter: blur(50px) !important;
            box-shadow:
              4px 4px 4px rgba(0, 0, 0, 0.05),
              inset 0 1px 1px rgba(255, 255, 255, 0.15) !important;
          }

          .button--brand-primary,
          .button--primary,
          .button--secondary,
          .social-sign-in--tile {
            background: rgba(255, 255, 255, 0.2) !important;
            border: 1px solid rgba(255, 255, 255, 0.26) !important;
            box-shadow:
              0 10px 22px rgba(0, 0, 0, 0.22),
              inset 0 1px 1px rgba(255, 255, 255, 0.24) !important;
          }

          .button:hover,
          .list-tile:hover,
          .social-sign-in--tile:hover,
          .wallet-list-item__tile:hover {
            background: rgba(255, 255, 255, 0.24) !important;
            transform: translateY(-1px);
          }

          .social-sign-in--tile,
          .wallet-list-item__tile,
          .list-item-button {
            border-radius: 14px !important;
            padding: 0.72rem 0.9rem !important;
          }

          .wallet-list,
          .wallets-list,
          .wallet-list-items {
            display: flex;
            flex-direction: column;
            gap: 0.45rem !important;
          }

          .wallet-list-item + .wallet-list-item,
          .social-sign-in--tile + .social-sign-in--tile,
          .list-tile + .list-tile {
            margin-top: 0.22rem !important;
          }

          .input__container .input {
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            background: rgba(255, 255, 255, 0.02) !important;
            backdrop-filter: blur(50px) !important;
            -webkit-backdrop-filter: blur(50px) !important;
            border-radius: 14px !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            font-size: 0.95rem !important;
            line-height: 1.2 !important;
            font-weight: 500;
            min-height: 2.95rem !important;
            padding-top: 0.72rem !important;
            padding-bottom: 0.72rem !important;
            box-shadow:
              4px 4px 4px rgba(0, 0, 0, 0.05),
              inset 0 1px 1px rgba(255, 255, 255, 0.15) !important;
          }

          .input__container {
            border-radius: 14px !important;
            overflow: hidden;
          }

          .input__container .input::placeholder {
            color: rgba(255, 255, 255, 0.44) !important;
          }

          .login-view__scroll__section--emailAndPhone .input__label {
            display: none !important;
          }

          .divider__dash {
            background-color: rgba(255, 255, 255, 0.2) !important;
          }

          .typography,
          [class*="typography--"],
          .button .typography,
          .list-tile .typography,
          .input__label,
          .layout-header__icon {
            color: #ffffff !important;
          }

          .powered-by-dynamic {
            width: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.35rem;
            margin-top: 0.15rem;
            opacity: 1;
          }

          .powered-by-dynamic__text,
          .powered-by-dynamic .typography {
            color: rgba(255, 255, 255, 0.74) !important;
            font-size: 0.72rem !important;
            line-height: 1.2 !important;
            letter-spacing: 0.02em;
            font-weight: 500;
          }

          .powered-by-dynamic a {
            color: rgba(255, 255, 255, 0.82) !important;
            text-decoration: none !important;
          }

          .powered-by-dynamic a:hover {
            color: #ffffff !important;
          }

          .powered-by-dynamic svg,
          .powered-by-dynamic__icon {
            opacity: 0.82;
            transform: translateY(0.5px);
            color: rgba(255, 255, 255, 0.82) !important;
          }
        `,
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
