/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as ai_aiUtils from "../ai/aiUtils.js";
import type * as ai_proposalFitAnalysis from "../ai/proposalFitAnalysis.js";
import type * as auth from "../auth.js";
import type * as calls from "../calls.js";
import type * as evaluations from "../evaluations.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as matrix from "../matrix.js";
import type * as migrations from "../migrations.js";
import type * as proposals from "../proposals.js";
import type * as rubrics from "../rubrics.js";
import type * as seed from "../seed.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  "ai/aiUtils": typeof ai_aiUtils;
  "ai/proposalFitAnalysis": typeof ai_proposalFitAnalysis;
  auth: typeof auth;
  calls: typeof calls;
  evaluations: typeof evaluations;
  http: typeof http;
  invitations: typeof invitations;
  "lib/openrouter": typeof lib_openrouter;
  matrix: typeof matrix;
  migrations: typeof migrations;
  proposals: typeof proposals;
  rubrics: typeof rubrics;
  seed: typeof seed;
  transactions: typeof transactions;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
