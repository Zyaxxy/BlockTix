"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface ProfileFormProps {
  userId: string;
  onComplete: () => void;
}

export default function ProfileForm({ userId, onComplete }: ProfileFormProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getInitials = (n: string) =>
    n
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    const { error: dbError } = await supabase.from("users").upsert(
      { uid: userId, role: "user", name: name.trim() },
      { onConflict: "uid" }
    );

    if (dbError) {
      setError("Something went wrong. Please try again.");
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
          Complete your profile
        </h2>
        <p className="text-sm text-white/50 mt-2 font-light">
          Tell us a bit about yourself
        </p>
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center mb-8">
        <div className="h-20 w-20 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-2xl font-medium text-white/80 transition-all duration-300">
          {name.trim() ? getInitials(name) : "?"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="block text-sm text-white/60 mb-2 font-light"
          >
            Display Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="liquid-glass-strong text-shadow-soft w-full rounded-full py-3 text-sm font-medium text-white disabled:opacity-40 transition-all hover:bg-white/12 hover:border-white/25"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </motion.div>
  );
}