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
import type * as mutations_chatMessages from "../mutations/chatMessages.js";
import type * as mutations_chats from "../mutations/chats.js";
import type * as mutations_clients from "../mutations/clients.js";
import type * as mutations_users from "../mutations/users.js";
import type * as queries_chats from "../queries/chats.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "mutations/chatMessages": typeof mutations_chatMessages;
  "mutations/chats": typeof mutations_chats;
  "mutations/clients": typeof mutations_clients;
  "mutations/users": typeof mutations_users;
  "queries/chats": typeof queries_chats;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
