// External Supabase client used by the imported "magic" app.
// Points to the original project that was bundled with the source code.
// This is intentionally separate from the auto-managed Lovable Cloud client
// in src/integrations/supabase/client.ts (DO NOT edit that one).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://kvqhocuuyzwszspuqxmp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cWhvY3V1eXp3c3pzcHVxeG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODkzMTYsImV4cCI6MjA5MzQ2NTMxNn0.KXL1JKXuJ-h9KQwJU75SitApajGU01nnA5dquU-jggk";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

export const SUPABASE_PROJECT_ID = "kvqhocuuyzwszspuqxmp";
