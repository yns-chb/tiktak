// @ts-expect-error Bun runtime module
import { Database } from "bun:sqlite";
import { betterAuth } from "better-auth";
import { fileURLToPath } from "node:url";

// Variables lues au démarrage du service (systemd), pas figées au build
const env = (nom: string) => process.env[nom] ?? (import.meta.env as Record<string, string>)[nom];

const database = new Database(process.env.DB_PATH ?? fileURLToPath(new URL("../../data/db.sqlite", import.meta.url)), { create: true });

export const auth = betterAuth({
  database,
  baseURL: env("BETTER_AUTH_URL"),
  secret: env("BETTER_AUTH_SECRET"),
  emailAndPassword: { enabled: true },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  socialProviders: {
    google: {
      clientId: env("GOOGLE_CLIENT_ID") as string,
      clientSecret: env("GOOGLE_CLIENT_SECRET") as string,
    },
  },
});