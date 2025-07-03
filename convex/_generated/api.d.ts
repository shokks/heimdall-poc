/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as background from "../background.js";
import type * as cron from "../cron.js";
import type * as historicalData from "../historicalData.js";
import type * as news from "../news.js";
import type * as portfolios from "../portfolios.js";
import type * as stocks from "../stocks.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  background: typeof background;
  cron: typeof cron;
  historicalData: typeof historicalData;
  news: typeof news;
  portfolios: typeof portfolios;
  stocks: typeof stocks;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
