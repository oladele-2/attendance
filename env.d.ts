interface Env {
  HYPERDRIVE?: Hyperdrive;
  ASSETS?: Fetcher;
  PASSWORD_PEPPER: string;
  SESSION_SECRET: string;
  DATABASE_URL?: string;
}

declare module "cloudflare:workers" {
  export const env: Env;
}

