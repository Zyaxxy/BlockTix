"use client";

import {
  DynamicEmbeddedAuthFlow,
  useDynamicContext,
  useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchUserProfile, persistUserProfile } from "@/lib/profile";
import BackgroundShader from "../landing/BackgroundShader";
import ProfileForm from "./ProfileForm";

type AuthPageShellProps = {
  role: "user" | "organizer";
  redirectPath: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  mobileTitle: string;
  mobileSubtitle: string;
};

export default function AuthPageShell({
  role,
  redirectPath,
  sidebarTitle,
  sidebarSubtitle,
  mobileTitle,
  mobileSubtitle,
}: AuthPageShellProps) {
  const { user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const router = useRouter();
  const [authStep, setAuthStep] = useState<"auth" | "profile">("auth");

  useEffect(() => {
    if (!isLoggedIn || !user?.userId) return;

    const handlePostAuth = async () => {
      try {
        const uid = user.userId!;
        const data = await fetchUserProfile(uid);

        if (data?.role && data.role !== role) {
          router.replace(data.role === "organizer" ? "/organizer" : "/user");
          return;
        }

        if (data?.name) {
          await persistUserProfile({
            uid,
            role,
            name: data.name,
            avatarUrl: data.avatarUrl ?? undefined,
          });
          router.replace(redirectPath);
          return;
        }

        setAuthStep("profile");
      } catch {
        setAuthStep("auth");
      }
    };

    handlePostAuth();
  }, [isLoggedIn, user, router, role, redirectPath]);

  return (
    <div className="relative h-dvh overflow-hidden bg-black text-white">
      <BackgroundShader />

      <div className="relative z-50 pointer-events-none">
        <div className="flex h-dvh items-center justify-center px-2 py-2 sm:px-3 sm:py-3 md:px-4 lg:px-5 lg:py-5">
          <AnimatePresence mode="wait">
            {authStep === "auth" ? (
              <motion.section
                key="auth"
                className="liquid-glass-strong pointer-events-auto h-full max-h-[calc(100dvh-1rem)] w-full max-w-[60rem] overflow-hidden rounded-[1.25rem] p-2 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-[1.5rem] sm:p-2.5 md:p-3 lg:max-h-[calc(100dvh-2rem)] lg:p-4"
                initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div className="grid h-full items-stretch gap-2.5 lg:grid-cols-[minmax(220px,0.75fr)_minmax(320px,1.25fr)] lg:gap-4">
                  <aside className="liquid-glass hidden flex-col justify-between rounded-3xl p-5 lg:flex lg:p-6">
                    <div>
                      <h1 className="font-display italic text-4xl tracking-tight text-white text-shadow-soft xl:text-5xl">
                        BlockTix
                      </h1>
                      <p className="mt-2 text-sm font-light text-white/65">{sidebarTitle}</p>
                    </div>

                    <p className="max-w-[24ch] text-xs font-light leading-relaxed text-white/45">
                      {sidebarSubtitle}
                    </p>
                  </aside>

                  <div className="liquid-glass flex min-h-0 flex-col rounded-3xl p-2 sm:p-2.5 md:p-3 lg:p-4">
                    <div className="mb-3 text-center lg:mb-4 lg:hidden">
                      <h1 className="font-display italic text-3xl tracking-tight text-white text-shadow-soft sm:text-4xl">
                        {mobileTitle}
                      </h1>
                      <p className="mt-1.5 text-sm font-light text-white/55">{mobileSubtitle}</p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl">
                      <DynamicEmbeddedAuthFlow key="embedded-auth" />
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : (
              <ProfileForm
                key="profile"
                userId={user?.userId ?? ""}
                role={role}
                onComplete={() => router.replace(redirectPath)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}