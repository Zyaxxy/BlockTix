"use client";

import { useMemo, useState } from "react";
import {
  useDynamicContext,
  useDynamicWaas,
  useProjectSettings,
} from "@dynamic-labs/sdk-react-core";
import { Loader2, WalletCards } from "lucide-react";

const EMAIL_CREDENTIAL_FORMAT = "email";
const PHONE_CREDENTIAL_FORMAT = "phoneNumber";
const BLOCKCHAIN_CREDENTIAL_FORMAT = "blockchain";
const SOL_CHAIN = "SOL";

const ALLOWED_LOGIN_FORMATS = new Set([
  EMAIL_CREDENTIAL_FORMAT,
  PHONE_CREDENTIAL_FORMAT,
]);

export function ClaimEmbeddedWalletButton() {
  const { user, refetchProjectSettings } = useDynamicContext();
  const {
    createWalletAccount,
    dynamicWaasIsEnabled,
    initializeWaas,
    shouldInitializeWaas,
  } = useDynamicWaas();
  const projectSettings = useProjectSettings();
  const [status, setStatus] = useState<"idle" | "creating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeEnvironmentId =
    process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "(missing NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID)";

  const enabledEmbeddedChains = useMemo(() => {
    const chainConfigurations = projectSettings?.sdk?.embeddedWallets?.chainConfigurations ?? [];
    return chainConfigurations.filter((chain) => chain.enabled).map((chain) => chain.name);
  }, [projectSettings]);

  const isEligible = useMemo(() => {
    const verifiedCredentials = user?.verifiedCredentials ?? [];

    if (verifiedCredentials.length === 0) {
      return false;
    }

    const hasBlockchainCredential = verifiedCredentials.some(
      (credential) => credential.format === BLOCKCHAIN_CREDENTIAL_FORMAT
    );

    const hasEmailOrPhoneCredential = verifiedCredentials.some((credential) =>
      ALLOWED_LOGIN_FORMATS.has(credential.format)
    );

    return hasEmailOrPhoneCredential && !hasBlockchainCredential;
  }, [user?.verifiedCredentials]);

  if (!isEligible) {
    return null;
  }

  const onCreateEmbeddedWallet = async () => {
    if (!dynamicWaasIsEnabled || status === "creating" || status === "success") return;

    setStatus("creating");
    setErrorMessage(null);

    try {
      await refetchProjectSettings?.();

      if (shouldInitializeWaas) {
        await initializeWaas();
      }

      try {
        await createWalletAccount([SOL_CHAIN] as Parameters<typeof createWalletAccount>[0]);
      } catch {
        await createWalletAccount(
          [{ chain: SOL_CHAIN }] as Parameters<typeof createWalletAccount>[0]
        );
      }

      setStatus("success");
    } catch (error) {
      const sdkMessage =
        error instanceof Error && error.message
          ? error.message
          : "Could not create wallet right now. Please try again.";
      setErrorMessage(sdkMessage);
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={onCreateEmbeddedWallet}
        disabled={!dynamicWaasIsEnabled || status === "creating" || status === "success"}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "creating" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <WalletCards className="h-4 w-4" />
        )}
        {status === "creating"
          ? "Creating wallet..."
          : status === "success"
            ? "Embedded wallet ready"
            : "Create Embedded Wallet"}
      </button>

      {status === "error" && (
        <p className="max-w-[34ch] text-xs text-rose-300">
          {errorMessage ?? "Could not create wallet right now. Please try again."}
        </p>
      )}
      {enabledEmbeddedChains.length > 0 && (
        <p className="max-w-[42ch] text-[11px] text-white/60">
          Dynamic env: {activeEnvironmentId}. Enabled embedded chains: {enabledEmbeddedChains.join(", ")}.
        </p>
      )}
      {enabledEmbeddedChains.length === 0 && (
        <p className="max-w-[42ch] text-[11px] text-amber-200">
          Dynamic env: {activeEnvironmentId}. This environment reports no enabled embedded wallet chains.
        </p>
      )}
      {!dynamicWaasIsEnabled && (
        <p className="text-xs text-amber-200">Embedded wallet creation is disabled in Dynamic dashboard settings.</p>
      )}
    </div>
  );
}
