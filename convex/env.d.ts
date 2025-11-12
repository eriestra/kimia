/**
 * Convex Environment Variables
 *
 * These environment variables should be set in the Convex dashboard:
 * Navigate to your deployment > Settings > Environment Variables
 *
 * Required variables:
 * - AUTH_SECRET: A random string for JWT signing (generate with: openssl rand -base64 32)
 * - SITE_URL: The URL of your site (e.g., http://localhost:5173 for dev)
 */

declare module "convex/server" {
  interface Env {
    AUTH_SECRET?: string;
    SITE_URL?: string;
  }
}
