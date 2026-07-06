/**
 * Auth.js uses AUTH_URL for post-sign-out redirects. If it stays as localhost
 * in a deployed environment, users get sent to localhost after sign out.
 */
export function ensureAuthUrl() {
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  const looksLocal =
    !configured || configured.includes("localhost") || configured.includes("127.0.0.1");

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  if (looksLocal && vercelHost) {
    process.env.AUTH_URL = `https://${vercelHost}`;
    return;
  }

  if (!process.env.AUTH_URL && configured) {
    process.env.AUTH_URL = configured;
  }
}
