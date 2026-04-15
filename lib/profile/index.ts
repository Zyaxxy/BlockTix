import { getSupabaseBrowserClient } from "@/utils/supabase/client";
import { createTableGuard } from "../supabase/table-guard";

export const USERS_TABLE = "users";
const MISSING_USERS_TABLE_ERROR =
  "Supabase table public.users is missing. Create it in Supabase SQL Editor and retry.";

const usersTableGuard = createTableGuard(USERS_TABLE);

export type UserRole = "user" | "organizer";

export type UserProfile = {
  uid: string;
  role: UserRole;
  name: string | null;
  avatarUrl: string | null;
};

type PersistUserProfileInput = {
  uid: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
};

const profileCacheKey = (uid: string) => `blocktix.profile.${uid}`;

const readCachedProfile = (
  uid: string
): Pick<UserProfile, "name" | "avatarUrl"> | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(profileCacheKey(uid));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      name?: string | null;
      avatarUrl?: string | null;
    };

    return {
      name: parsed.name ?? null,
      avatarUrl: parsed.avatarUrl ?? null,
    };
  } catch {
    return null;
  }
};

const cacheProfile = (
  uid: string,
  profile: Pick<UserProfile, "name" | "avatarUrl">
) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(profileCacheKey(uid), JSON.stringify(profile));
};

const isMissingColumnError = (errorMessage: string | undefined, column: string) =>
  Boolean(errorMessage?.toLowerCase().includes(column.toLowerCase()));

export const buildAvatarUrl = (seed: string) => {
  const safeSeed = encodeURIComponent(seed.trim() || "blocktix");
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${safeSeed}&backgroundType=gradientLinear&backgroundColor=f97316,f59e0b,1f2937`;
};

export const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (usersTableGuard.isTableMissing()) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const cached = readCachedProfile(uid);

  const { data: withAvatarData, error: withAvatarError } = await supabase
    .from(USERS_TABLE)
    .select("uid, role, name, avatar_url")
    .eq("uid", uid)
    .maybeSingle();

  if (withAvatarData) {
    const profile: UserProfile = {
      uid: withAvatarData.uid,
      role: withAvatarData.role,
      name: withAvatarData.name ?? cached?.name ?? null,
      avatarUrl: withAvatarData.avatar_url ?? cached?.avatarUrl ?? null,
    };

    cacheProfile(uid, {
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });

    return profile;
  }

  if (usersTableGuard.isMissingTableError(withAvatarError?.message)) {
    usersTableGuard.markTableMissing();
    return null;
  }

  if (!isMissingColumnError(withAvatarError?.message, "avatar_url")) {
    return null;
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from(USERS_TABLE)
    .select("uid, role, name")
    .eq("uid", uid)
    .maybeSingle();

  if (usersTableGuard.isMissingTableError(fallbackError?.message)) {
    usersTableGuard.markTableMissing();
    return null;
  }

  if (!fallbackData) return null;

  const profile: UserProfile = {
    uid: fallbackData.uid,
    role: fallbackData.role,
    name: fallbackData.name ?? cached?.name ?? null,
    avatarUrl: cached?.avatarUrl ?? null,
  };

  cacheProfile(uid, {
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  });

  return profile;
};

export const persistUserProfile = async ({
  uid,
  role,
  name,
  avatarUrl,
}: PersistUserProfileInput) => {
  if (usersTableGuard.isTableMissing()) {
    return { error: MISSING_USERS_TABLE_ERROR };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { error: "Supabase client is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY." };
  }

  const cleanName = name.trim();
  const cleanAvatar = (avatarUrl ?? "").trim() || buildAvatarUrl(cleanName || uid);

  const basePayload = {
    uid,
    role,
    name: cleanName,
  };

  const payloadWithAvatar = {
    ...basePayload,
    avatar_url: cleanAvatar,
  };

  const { error: withAvatarError } = await supabase
    .from(USERS_TABLE)
    .upsert(payloadWithAvatar, { onConflict: "uid" });

  if (!withAvatarError) {
    cacheProfile(uid, {
      name: cleanName,
      avatarUrl: cleanAvatar,
    });
    return { error: null as string | null };
  }

  if (usersTableGuard.isMissingTableError(withAvatarError?.message)) {
    usersTableGuard.markTableMissing();
    return { error: MISSING_USERS_TABLE_ERROR };
  }

  if (!isMissingColumnError(withAvatarError.message, "avatar_url")) {
    return { error: withAvatarError.message };
  }

  const { error: fallbackError } = await supabase
    .from(USERS_TABLE)
    .upsert(basePayload, { onConflict: "uid" });

  if (usersTableGuard.isMissingTableError(fallbackError?.message)) {
    usersTableGuard.markTableMissing();
    return { error: MISSING_USERS_TABLE_ERROR };
  }

  if (fallbackError) {
    return { error: fallbackError.message };
  }

  cacheProfile(uid, {
    name: cleanName,
    avatarUrl: cleanAvatar,
  });

  return { error: null as string | null };
};