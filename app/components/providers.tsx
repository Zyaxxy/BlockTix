"use client";

import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { ReactNode, useEffect } from "react";

const DYNAMIC_ENV_CACHE_KEY = "blocktix.dynamic.environment.id";

const clearDynamicStorage = () => {
  const shouldClear = (key: string) => key.toLowerCase().includes("dynamic");

  for (const key of Object.keys(localStorage)) {
    if (shouldClear(key)) {
      localStorage.removeItem(key);
    }
  }

  for (const key of Object.keys(sessionStorage)) {
    if (shouldClear(key)) {
      sessionStorage.removeItem(key);
    }
  }
};

const isExtensionFetchFailure = (message: string, stackOrSource: string) => {
  return (
    message.toLowerCase().includes("failed to fetch") &&
    stackOrSource.toLowerCase().includes("chrome-extension://")
  );
};

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const dynamicEnvironmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID?.trim();

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason instanceof Error
            ? reason.message
            : "";
      const stack =
        reason instanceof Error
          ? reason.stack ?? ""
          : "";

      if (isExtensionFetchFailure(message, stack)) {
        event.preventDefault();
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      const message = event.message ?? "";
      const source = event.filename ?? "";

      if (isExtensionFetchFailure(message, source)) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
    };
  }, []);

  useEffect(() => {
    if (!dynamicEnvironmentId) {
      return;
    }

    try {
      const previousEnvironmentId = localStorage.getItem(DYNAMIC_ENV_CACHE_KEY);

      // If the Dynamic env changed, clear stale cached signatures and rehydrate once.
      if (previousEnvironmentId && previousEnvironmentId !== dynamicEnvironmentId) {
        clearDynamicStorage();
        localStorage.setItem(DYNAMIC_ENV_CACHE_KEY, dynamicEnvironmentId);
        window.location.reload();
        return;
      }

      localStorage.setItem(DYNAMIC_ENV_CACHE_KEY, dynamicEnvironmentId);
    } catch {
      // Ignore storage access errors and continue rendering.
    }
  }, [dynamicEnvironmentId]);

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
        transactionConfirmation: {
          required: false,
        },
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

          .select-hardware-wallet-view__container {
            gap: 0.7rem !important;
          }

          .select-hardware-wallet-view__text {
            color: rgba(255, 255, 255, 0.78) !important;
            font-size: 0.82rem !important;
            line-height: 1.3 !important;
          }

          .select-hardware-wallet-view__container .list-tile {
            border-radius: 14px !important;
            border: 1px solid rgba(255, 255, 255, 0.26) !important;
            background: rgba(255, 255, 255, 0.2) !important;
            box-shadow:
              0 10px 22px rgba(0, 0, 0, 0.22),
              inset 0 1px 1px rgba(255, 255, 255, 0.24) !important;
            padding: 0.72rem 0.9rem !important;
          }

          .select-hardware-wallet-view__container .list-tile .typography {
            color: #ffffff !important;
            font-weight: 600 !important;
          }

          .hardware-wallet-toggle__toggle .toggle--content {
            background: rgba(255, 255, 255, 0.28) !important;
            border: 1px solid rgba(255, 255, 255, 0.28) !important;
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.26) !important;
          }

          .hardware-wallet-toggle__toggle .toggle--knob {
            background: rgba(16, 16, 22, 0.9) !important;
            color: #ffffff !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35) !important;
          }

          .otp-verification-view,
          .otp-verification-view__body,
          .otp-verification-view__destination-container {
            color: rgba(255, 255, 255, 0.9) !important;
          }

          .otp-verification-view__destination-container {
            margin-top: 0.1rem;
            margin-bottom: 0.25rem;
          }

          .pin-field__container {
            display: grid !important;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 0.44rem !important;
            margin-top: 0.35rem;
          }

          .pin-input__input {
            width: 100% !important;
            height: 2.85rem !important;
            border-radius: 12px !important;
            border: 1px solid rgba(255, 255, 255, 0.24) !important;
            background: rgba(255, 255, 255, 0.09) !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            text-align: center;
            font-size: 1.02rem !important;
            font-weight: 700;
            box-shadow:
              0 8px 18px rgba(0, 0, 0, 0.22),
              inset 0 1px 1px rgba(255, 255, 255, 0.24) !important;
            transition: border-color 160ms ease, transform 160ms ease;
          }

          .pin-input__input:focus {
            outline: none !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
            transform: translateY(-1px);
          }

          .pin-input__input--error {
            border-color: rgba(255, 122, 122, 0.92) !important;
            box-shadow:
              0 0 0 1px rgba(255, 122, 122, 0.3),
              0 8px 18px rgba(0, 0, 0, 0.22),
              inset 0 1px 1px rgba(255, 255, 255, 0.2) !important;
          }

          .pin-input__input--success {
            border-color: rgba(140, 255, 210, 0.88) !important;
          }

          .retry-send-verification-code-section,
          .otp-verification-view__retry-container,
          .email-verification__retry-container {
            margin-top: 0.5rem !important;
          }

          .collect-user-data__network-container,
          .wallet-no-access__wallet-address-container {
            border-radius: 14px !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            background: rgba(255, 255, 255, 0.08) !important;
            box-shadow:
              0 8px 18px rgba(0, 0, 0, 0.2),
              inset 0 1px 1px rgba(255, 255, 255, 0.2) !important;
            padding: 0.58rem 0.72rem !important;
          }

          .collect-user-data__wallet-address,
          .wallet-no-access__wallet-address,
          .wallet-used-view__shorten-wallet-address,
          .wallet-already-exists-view__shorten-wallet-address,
          .wallet-cannot-be-transferred-view__shorten-wallet-address {
            color: #ffffff !important;
            font-weight: 700 !important;
            letter-spacing: 0.01em;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.32);
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

          .login-view__scroll .input__container .input__label,
          .input__container.input__container--dense .input__label {
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
