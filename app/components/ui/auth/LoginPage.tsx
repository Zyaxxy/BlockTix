"use client";

import {
  DynamicEmbeddedAuthFlow,
  useDynamicWaas,
  useDynamicContext,
  useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchUserProfile, persistUserProfile } from "@/lib/profile";
import ProfileForm from "./ProfileForm";
import BackgroundShader from "../landing/BackgroundShader";

const EMAIL_CREDENTIAL_FORMAT = "email";
const BLOCKCHAIN_CREDENTIAL_FORMAT = "blockchain";
const SOL_CHAIN = "SOL";

export default function LoginPage() {
  const { user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const { createWalletAccount, dynamicWaasIsEnabled } = useDynamicWaas();
  const router = useRouter();
  const [authStep, setAuthStep] = useState<"auth" | "profile">("auth");
  const walletProvisionAttemptedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !user?.userId) return;

    const handlePostAuth = async () => {
      const uid = user.userId!;

      const hasEmailCredential =
        user.verifiedCredentials?.some(
          (credential) => credential.format === EMAIL_CREDENTIAL_FORMAT
        ) ?? false;
      const hasBlockchainCredential =
        user.verifiedCredentials?.some(
          (credential) => credential.format === BLOCKCHAIN_CREDENTIAL_FORMAT
        ) ?? false;

      const shouldAutoCreateEmbeddedWallet =
        dynamicWaasIsEnabled &&
        hasEmailCredential &&
        !hasBlockchainCredential &&
        walletProvisionAttemptedForRef.current !== uid;

      if (shouldAutoCreateEmbeddedWallet) {
        walletProvisionAttemptedForRef.current = uid;

        try {
          await createWalletAccount(
            [SOL_CHAIN] as Parameters<typeof createWalletAccount>[0]
          );
        } catch {
          // Non-blocking: if this fails, users can still proceed and retry wallet creation later.
        }
      }

      const data = await fetchUserProfile(uid);

      if (data?.role === "organizer") {
        router.replace("/organizer");
        return;
      }

      if (data?.name) {
        await persistUserProfile({
          uid,
          role: "user",
          name: data.name,
          avatarUrl: data.avatarUrl ?? undefined,
        });
        router.replace("/user");
        return;
      }

      setAuthStep("profile");
    };

    handlePostAuth();
  }, [isLoggedIn, user, router, createWalletAccount, dynamicWaasIsEnabled]);

  return (
    <div className="fixed inset-0 min-h-screen bg-black text-white overflow-hidden">
      <BackgroundShader />

      <div className="fixed inset-0 z-50 pointer-events-none overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-6 md:px-8 md:py-10">
          <AnimatePresence mode="wait">
            {authStep === "auth" ? (
              <motion.section
                key="auth"
                className="liquid-glass-strong pointer-events-auto w-full max-w-5xl rounded-[2rem] p-3 sm:p-4 md:p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
                initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div className="grid items-stretch gap-3 md:gap-6 md:grid-cols-[minmax(240px,0.8fr)_minmax(360px,1.2fr)]">
                  <aside className="liquid-glass rounded-3xl p-6 md:p-8 hidden md:flex flex-col justify-between">
                    <div>
                      <h1 className="font-display italic text-5xl tracking-tight text-white text-shadow-soft">
                        BlockTix
                      </h1>
                      <p className="text-white/65 mt-2 text-sm font-light">
                        Your access, on-chain
                      </p>
                    </div>

                    <p className="text-xs text-white/45 font-light leading-relaxed max-w-[24ch]">
                      Connect with wallet, email, or social to enter your dashboard securely.
                    </p>
                  </aside>

                  <div className="liquid-glass rounded-3xl p-3 sm:p-4 md:p-5">
                    <div className="text-center mb-3 md:mb-4 md:hidden">
                      <h1 className="font-display italic text-4xl tracking-tight text-white text-shadow-soft">
                        SOLTix
                      </h1>
                      <p className="text-sm text-white/55 mt-1.5 font-light">
                        Your access, on-chain
                      </p>
                    </div>

                    <div className="rounded-2xl overflow-hidden min-h-[380px] md:min-h-[460px] max-h-[82vh] md:max-h-none overflow-y-auto md:overflow-visible">
                      <DynamicEmbeddedAuthFlow key="embedded-auth" />
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : (
              <ProfileForm
                key="profile"
                userId={user?.userId ?? ""}
                role="user"
                onComplete={() => router.replace("/user")}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}