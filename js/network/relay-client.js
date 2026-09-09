// js/network/relay-client.js
//
// All platform data — listings, stores, messages, moderation actions — travels
// as signed events over this relay pool. There is no application database;
// the relay set *is* the backend. Swap DEFAULT_RELAYS for your own for full control.

import { SimplePool, finalizeEvent } from "https://esm.sh/nostr-tools@2.7.2";

export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
];

// Custom kind numbers (30000+ range = addressable/app-defined events, per NIP-01/33)
export const KIND = {
  LISTING: 30402,        // classified listing (replaceable, like NIP-99)
  STORE_PROFILE: 30403,
  DIRECT_MESSAGE: 30404, // encrypted envelope, see encryption-core.js
  REVIEW_DECISION: 30405, // admin approve/reject
  NOTIFICATION: 30406,
};

let pool = null;

export function getPool() {
  if (!pool) pool = new SimplePool();
  return pool;
}

/** Sign and publish an event built from a template, using the local secret key. */
export function publishEvent(secretKeyBytes, template, relays = DEFAULT_RELAYS) {
  const event = finalizeEvent(
    { ...template, created_at: Math.floor(Date.now() / 1000) },
    secretKeyBytes
  );
  const results = getPool().publish(relays, event);
  return { event, results };
}

/** One-shot fetch matching a filter (e.g. all listings in a category). */
export async function queryEvents(filter, relays = DEFAULT_RELAYS) {
  return getPool().querySync(relays, filter);
}

/** Live subscription — calls onEvent for every matching event as it arrives. */
export function subscribe(filter, onEvent, relays = DEFAULT_RELAYS) {
  return getPool().subscribeMany(relays, [filter], {
    onevent: onEvent,
  });
}

export function closeAll() {
  if (pool) pool.close(DEFAULT_RELAYS);
}
