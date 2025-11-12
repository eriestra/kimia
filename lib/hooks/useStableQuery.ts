/**
 * useStableQuery - Convex-compatible hook for stable query results
 *
 * Prevents reactive queries from returning `undefined` during re-fetches,
 * which would cause form state to be overwritten during auto-save operations.
 *
 * Based on Convex best practices from:
 * https://stack.convex.dev/help-my-app-is-overreacting
 *
 * Use this hook when:
 * - Forms with auto-save functionality
 * - User is actively editing while queries update
 * - You want to keep stale data visible during loading
 *
 * Do NOT use this hook when:
 * - Displaying read-only data (dashboards, lists)
 * - You want immediate reactivity (filtering, search)
 * - Initial page load (showing loading states is appropriate)
 */

import { useQuery } from "convex/react";
import { useRef } from "react";

/**
 * A drop-in replacement for useQuery that keeps previous results
 * visible while new data is loading, preventing form state overwrites.
 *
 * @example
 * // Before (broken with auto-save):
 * const data = useQuery(api.proposals.getDraft, { callId });
 *
 * // After (stable during auto-save):
 * const data = useStableQuery(api.proposals.getDraft, { callId });
 */
export const useStableQuery = ((query: any, ...args: any[]) => {
  const result = useQuery(query, ...args);
  const stored = useRef(result);

  // Only update stored value when result is not undefined
  if (result !== undefined) {
    stored.current = result;
  }

  return stored.current;
}) as typeof useQuery;
