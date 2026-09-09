// js/marketplace/ranking-algorithm.js
//
// Goal from the brief: competitive with big marketplaces, but must not let
// large/established sellers permanently bury small or new ones.
//
// Score = weighted blend of:
//   - recency         (fresh listings get a temporary boost — everyone gets a fair first look)
//   - engagement rate  (views→saves→messages conversion, NOT raw view count —
//                        this is what stops "big seller = always on top")
//   - seller trust     (completed sales, response rate — earned, not size-based)
//   - small-seller lift(a bounded bonus for sellers below a listing-count threshold,
//                        decaying as they grow — mirrors the brief's "don't bury small sellers")
//   - manual boost     (admin tool, explicit and visible — not hidden pay-to-win)
//
// This is intentionally transparent and tunable — every weight below is a
// named constant, not a magic number buried in the formula.

export const WEIGHTS = {
  recency: 0.25,
  engagementRate: 0.35,
  sellerTrust: 0.20,
  smallSellerLift: 0.15,
  manualBoost: 0.05,
};

const SMALL_SELLER_THRESHOLD = 10; // listings; below this, lift applies
const RECENCY_HALF_LIFE_HOURS = 36;

export function scoreListing(listing, sellerStats, boost = 0) {
  const ageHours = (Date.now() / 1000 - listing.createdAt) / 3600;
  const recencyScore = Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);

  const views = Math.max(sellerStats.views || 0, 1);
  const conversions = (sellerStats.saves || 0) + (sellerStats.messages || 0) * 2;
  const engagementRate = Math.min(conversions / views, 1);

  const trustScore = Math.min(
    (sellerStats.completedSales || 0) * 0.05 + (sellerStats.responseRate || 0),
    1
  );

  const sellerListingCount = sellerStats.totalListings || 1;
  const smallSellerLift =
    sellerListingCount < SMALL_SELLER_THRESHOLD
      ? 1 - sellerListingCount / SMALL_SELLER_THRESHOLD
      : 0;

  const manualBoostScore = Math.min(boost, 1);

  return (
    recencyScore * WEIGHTS.recency +
    engagementRate * WEIGHTS.engagementRate +
    trustScore * WEIGHTS.sellerTrust +
    smallSellerLift * WEIGHTS.smallSellerLift +
    manualBoostScore * WEIGHTS.manualBoost
  );
}

/** Ranks a list of {listing, sellerStats, boost} entries, highest score first. */
export function rankListings(entries) {
  return entries
    .map((e) => ({ ...e, score: scoreListing(e.listing, e.sellerStats, e.boost || 0) }))
    .sort((a, b) => b.score - a.score);
}
