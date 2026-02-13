// Deno Runtime Type Definitions for Supabase Edge Functions

declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
    }

    const env: Env;
  }

  const Deno: typeof Deno;
}

export {};
