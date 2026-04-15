import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );

export const getSupabaseBrowserClient = () => {
  if (supabaseClient) return supabaseClient;

  try {
    supabaseClient = createClient();
    return supabaseClient;
  } catch {
    return null;
  }
};