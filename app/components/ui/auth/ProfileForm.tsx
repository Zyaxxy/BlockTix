"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { buildAvatarUrl, persistUserProfile, UserRole } from "@/lib/profile";
import { ImageUpload } from "../shared/ImageUpload";

interface ProfileFormProps {
  userId: string;
  role: UserRole;
  onComplete: () => void;
}

export default function ProfileForm({ userId, role, onComplete }: ProfileFormProps) {
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const getInitials = (n: string) =>
    n
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const previewAvatar = avatarUrl.trim() || buildAvatarUrl(name.trim() || userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    const cleanName = name.trim();
    const cleanAvatar = avatarUrl.trim() || buildAvatarUrl(cleanName || userId);
    const { error: dbError } = await persistUserProfile({
      uid: userId,
      role,
      name: cleanName,
      avatarUrl: cleanAvatar,
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
          Complete your profile
        </h2>
        <p className="text-sm text-white/50 mt-2 font-light">
          Tell us a bit about yourself
        </p>
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center mb-8">
        <div className="relative h-24 w-24 rounded-full bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden">
          <div
            aria-hidden="true"
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${previewAvatar})` }}
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-2xl font-semibold text-white/85 tracking-wide">
            {getInitials(name || "?")}
          </div>
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

        <div>
          <label
            htmlFor="avatar"
            className="block text-sm text-white/60 mb-2 font-light"
          >
            Avatar (optional)
          </label>
          <ImageUpload
            value={avatarUrl}
            onChange={setAvatarUrl}
            onUploadingChange={setIsUploading}
            bucket="avatars"
            maxSizeMB={2}
            placeholder="Drop image or click to upload"
            className="h-32 w-32 mx-auto"
          />
          <p className="mt-2 text-xs text-white/45 font-light text-center">
            Upload an image or leave empty for an auto-generated avatar.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || isUploading || !name.trim()}
          className="liquid-glass-strong text-shadow-soft w-full rounded-full py-3 text-sm font-medium text-white disabled:opacity-40 transition-all hover:bg-white/12 hover:border-white/25"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </motion.div>
  );
}