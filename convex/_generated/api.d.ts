/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as authInternal from "../authInternal.js";
import type * as authNode from "../authNode.js";
import type * as crons from "../crons.js";
import type * as discovery from "../discovery.js";
import type * as http from "../http.js";
import type * as impact from "../impact.js";
import type * as lib_adminAudit from "../lib/adminAudit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_guards from "../lib/guards.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as lib_midtrans from "../lib/midtrans.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_password from "../lib/password.js";
import type * as lib_profiles from "../lib/profiles.js";
import type * as lib_refunds from "../lib/refunds.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as merchants from "../merchants.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as processors from "../processors.js";
import type * as recoveryBatches from "../recoveryBatches.js";
import type * as surplusItems from "../surplusItems.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  authInternal: typeof authInternal;
  authNode: typeof authNode;
  crons: typeof crons;
  discovery: typeof discovery;
  http: typeof http;
  impact: typeof impact;
  "lib/adminAudit": typeof lib_adminAudit;
  "lib/auth": typeof lib_auth;
  "lib/guards": typeof lib_guards;
  "lib/ledger": typeof lib_ledger;
  "lib/midtrans": typeof lib_midtrans;
  "lib/notifications": typeof lib_notifications;
  "lib/password": typeof lib_password;
  "lib/profiles": typeof lib_profiles;
  "lib/refunds": typeof lib_refunds;
  "lib/tokens": typeof lib_tokens;
  merchants: typeof merchants;
  notifications: typeof notifications;
  orders: typeof orders;
  payments: typeof payments;
  processors: typeof processors;
  recoveryBatches: typeof recoveryBatches;
  surplusItems: typeof surplusItems;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
