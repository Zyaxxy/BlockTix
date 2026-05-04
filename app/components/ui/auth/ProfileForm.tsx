"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, User2 } from "lucide-react";
import { persistUserProfile, UserRole } from "@/lib/profile";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  userId: string;
  role: UserRole;
  onComplete: () => void;
}

export default function ProfileForm({ userId, role, onComplete }: ProfileFormProps) {
  const svgToDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const AVATAR_RGB: Record<number, string> = {
    1: "255, 0, 91",
    2: "255, 125, 16",
    3: "255, 0, 91",
    4: "137, 252, 179",
  };
  const avatars = [
    {
      id: 1,
      alt: "Avatar 1",
      src: svgToDataUrl(
        `<svg aria-label="Avatar 1" fill="none" height="40" role="img" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg"><title>Avatar 1</title><mask id="avatar-1-mask" x="0" y="0" width="36" height="36" maskUnits="userSpaceOnUse"><rect width="36" height="36" rx="72" fill="#FFFFFF"/></mask><g mask="url(#avatar-1-mask)"><rect width="36" height="36" fill="#ff005b"/><rect x="0" y="0" width="36" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18) scale(1)" fill="#ffb238"/><g transform="translate(4.5 -4) rotate(9 18 18)"><path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000000" stroke-linecap="round"/><rect x="10" y="14" width="1.5" height="2" rx="1" fill="#000000"/><rect x="24" y="14" width="1.5" height="2" rx="1" fill="#000000"/></g></g></svg>`
      ),
    },
    {
      id: 2,
      alt: "Avatar 2",
      src: svgToDataUrl(
        `<svg aria-label="Avatar 2" fill="none" height="40" role="img" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg"><title>Avatar 2</title><mask id="avatar-2-mask" x="0" y="0" width="36" height="36" maskUnits="userSpaceOnUse"><rect width="36" height="36" rx="72" fill="#FFFFFF"/></mask><g mask="url(#avatar-2-mask)"><rect width="36" height="36" fill="#ff7d10"/><rect x="0" y="0" width="36" height="36" rx="6" transform="translate(5 -1) rotate(55 18 18) scale(1.1)" fill="#0a0310"/><g transform="translate(7 -6) rotate(-5 18 18)"><path d="M15 20c2 1 4 1 6 0" fill="none" stroke="#FFFFFF" stroke-linecap="round"/><rect x="14" y="14" width="1.5" height="2" rx="1" fill="#FFFFFF"/><rect x="20" y="14" width="1.5" height="2" rx="1" fill="#FFFFFF"/></g></g></svg>`
      ),
    },
    {
      id: 3,
      alt: "Avatar 3",
      src: svgToDataUrl(
        `<svg aria-label="Avatar 3" fill="none" height="40" role="img" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg"><title>Avatar 3</title><mask id="avatar-3-mask" x="0" y="0" width="36" height="36" maskUnits="userSpaceOnUse"><rect width="36" height="36" rx="72" fill="#FFFFFF"/></mask><g mask="url(#avatar-3-mask)"><rect width="36" height="36" fill="#0a0310"/><rect x="0" y="0" width="36" height="36" rx="36" transform="translate(-3 7) rotate(227 18 18) scale(1.2)" fill="#ff005b"/><g transform="translate(-3 3.5) rotate(7 18 18)"><path d="M13,21 a1,0.75 0 0,0 10,0" fill="#FFFFFF"/><rect x="12" y="14" width="1.5" height="2" rx="1" fill="#FFFFFF"/><rect x="22" y="14" width="1.5" height="2" rx="1" fill="#FFFFFF"/></g></g></svg>`
      ),
    },
    {
      id: 4,
      alt: "Avatar 4",
      src: svgToDataUrl(
        `<svg aria-label="Avatar 4" fill="none" height="40" role="img" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg"><title>Avatar 4</title><mask id="avatar-4-mask" x="0" y="0" width="36" height="36" maskUnits="userSpaceOnUse"><rect width="36" height="36" rx="72" fill="#FFFFFF"/></mask><g mask="url(#avatar-4-mask)"><rect width="36" height="36" fill="#d8fcb3"/><rect x="0" y="0" width="36" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18) scale(1)" fill="#89fcb3"/><g transform="translate(4.5 -4) rotate(9 18 18)"><path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000000" stroke-linecap="round"/><rect x="10" y="14" width="1.5" height="2" rx="1" fill="#000000"/><rect x="24" y="14" width="1.5" height="2" rx="1" fill="#000000"/></g></g></svg>`
      ),
    },
  ] as const;

  type Avatar = (typeof avatars)[number];

  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  } as const;
  const thumbnailVariants = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
  } as const;

  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(avatars[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const isValid = name.trim().length >= 3;
  const showError = name.trim().length > 0 && name.trim().length < 3;
  const rgb = AVATAR_RGB[selectedAvatar.id];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError("");

    const cleanName = name.trim();
    const { error: dbError } = await persistUserProfile({
      uid: userId,
      role,
      name: cleanName,
      avatarUrl: selectedAvatar.src,
    });

    if (dbError) {
      setError(dbError);
      setLoading(false);
      return;
    }

    onComplete();
  };

  return (
    <motion.div
      className="liquid-glass-strong w-full max-w-md rounded-3xl p-8 md:p-10 pointer-events-auto shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
      initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="text-center mb-8">
        <h2 className="font-display italic text-3xl tracking-tight text-white text-shadow-soft">
          Pick Your Avatar
        </h2>
        <p className="text-sm text-white/50 mt-2 font-light">
          Choose one to get started
        </p>
      </div>

      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="relative h-40 w-40">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            animate={{
              boxShadow: `0 0 0 2px rgba(${rgb}, 0.55), 0 6px 24px rgba(${rgb}, 0.18)`,
            }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
          />
          <div className="relative h-full w-full overflow-hidden rounded-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedAvatar.id}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
              >
                <div
                  role="img"
                  aria-label={selectedAvatar.alt}
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${selectedAvatar.src})` }}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.span
            key={selectedAvatar.id}
            className="text-[11px] text-white/55 uppercase tracking-[0.12em]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.16, ease: "easeOut" }}
          >
            {selectedAvatar.alt}
          </motion.span>
        </AnimatePresence>

        <motion.div
          className="flex gap-3"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {avatars.map((avatar) => {
            const isSelected = selectedAvatar.id === avatar.id;
            return (
              <motion.button
                key={avatar.id}
                type="button"
                aria-label={`Select ${avatar.alt}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedAvatar(avatar)}
                className={cn(
                  "relative h-14 w-14 overflow-hidden rounded-xl border bg-white/5 transition-[opacity,box-shadow] duration-200 ease-out",
                  isSelected
                    ? "border-white/25 opacity-100 ring-2 ring-white/70 ring-offset-2 ring-offset-[#0a0b0d]"
                    : "border-white/10 opacity-60 hover:opacity-100"
                )}
                variants={thumbnailVariants}
                whileHover={shouldReduceMotion ? {} : { scale: 1.06 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.94 }}
              >
                <div
                  role="img"
                  aria-label={avatar.alt}
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${avatar.src})` }}
                />
                {isSelected && (
                  <div className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white">
                    <Check aria-hidden="true" className="h-3 w-3 text-black" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="block text-sm text-white/60 mb-2 font-light"
          >
            Display Name
          </label>
          <div className="relative">
            <input
              id="name"
              name="username"
              autoComplete="username"
              maxLength={20}
              spellCheck={false}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="your_username..."
              required
              autoFocus
              className={cn(
                "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors",
                showError && "border-red-400/50 focus:border-red-400/70"
              )}
            />
            <User2
              aria-hidden="true"
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                isFocused ? "text-white" : "text-white/45"
              )}
            />
            <span className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums",
              name.length >= 18 ? "text-amber-400" : "text-white/35"
            )}>
              {name.length}/20
            </span>
          </div>
          <AnimatePresence>
            {showError && (
              <motion.p
                role="alert"
                className="mt-2 text-xs text-red-400"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                Username must be at least 3 characters
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <button
          type="submit"
          disabled={loading || !isValid}
          className="group liquid-glass-strong text-shadow-soft w-full rounded-full py-3 text-sm font-medium text-white disabled:opacity-40 transition-all hover:bg-white/12 hover:border-white/25 inline-flex items-center justify-center gap-1"
        >
          {loading ? "Saving..." : "Get Started"}
          {!loading && (
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            />
          )}
        </button>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}
      </form>
    </motion.div>
  );
}
