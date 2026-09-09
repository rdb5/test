// js/marketplace/listings.js
import { publishEvent, queryEvents, KIND, DEFAULT_RELAYS } from "../network/relay-client.js";

/**
 * Publish a new listing. Status starts "pending" — it only becomes visible
 * in the public feed once an admin REVIEW_DECISION event approves it
 * (see js/admin/moderation.js).
 */
export function publishListing(secretKeyBytes, { title, description, price, currency, category, images, storeId }) {
  const content = JSON.stringify({ title, description, price, currency, images, status: "pending" });
  const tags = [
    ["d", crypto.randomUUID()], // NIP-33 addressable identifier
    ["category", category],
    ["store", storeId || ""],
    ["status", "pending"],
  ];
  return publishEvent(secretKeyBytes, { kind: KIND.LISTING, content, tags });
}

/** Fetch approved listings, optionally filtered by category. */
export async function fetchApprovedListings({ category } = {}, relays = DEFAULT_RELAYS) {
  const filter = { kinds: [KIND.LISTING], limit: 100 };
  if (category) filter["#category"] = [category];
  const events = await queryEvents(filter, relays);
  return events
    .map(parseListingEvent)
    .filter((l) => l.status === "approved");
}

export function parseListingEvent(event) {
  let content = {};
  try {
    content = JSON.parse(event.content);
  } catch {
    /* malformed event, skip fields */
  }
  const tag = (name) => event.tags.find((t) => t[0] === name)?.[1];
  return {
    id: event.id,
    sellerPubkey: event.pubkey,
    createdAt: event.created_at,
    title: content.title,
    description: content.description,
    price: content.price,
    currency: content.currency,
    images: content.images || [],
    status: tag("status") || content.status || "pending",
    category: tag("category"),
    storeId: tag("store"),
  };
}
