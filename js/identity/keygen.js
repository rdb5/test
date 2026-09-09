// js/identity/keygen.js
// Generates and manages the user's cryptographic identity, entirely client-side.
// No account is ever created on a server: the key pair *is* the account.

import {
  generateSecretKey,
  getPublicKey,
  nip19,
} from "https://esm.sh/nostr-tools@2.7.2";

const STORAGE_KEY = "dm_identity_v1";

/** Create a brand new identity (used from auth.html "Create account"). */
export function createIdentity(displayName) {
  const secretKey = generateSecretKey(); // Uint8Array
  const pubkey = getPublicKey(secretKey);
  const identity = {
    pubkey,
    secretKeyHex: bytesToHex(secretKey),
    nsec: nip19.nsecEncode(secretKey),
    npub: nip19.npubEncode(pubkey),
    displayName: displayName || "",
    createdAt: Date.now(),
  };
  persist(identity);
  return identity;
}

/** Restore an identity from a pasted/scanned nsec (used from auth.html "Restore"). */
export function restoreFromNsec(nsec) {
  const decoded = nip19.decode(nsec.trim());
  if (decoded.type !== "nsec") {
    throw new Error("invalid_nsec");
  }
  const secretKey = decoded.data;
  const pubkey = getPublicKey(secretKey);
  const identity = {
    pubkey,
    secretKeyHex: bytesToHex(secretKey),
    nsec,
    npub: nip19.npubEncode(pubkey),
    displayName: "",
    createdAt: Date.now(),
  };
  persist(identity);
  return identity;
}

export function getStoredIdentity() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function updateDisplayName(name) {
  const identity = getStoredIdentity();
  if (!identity) return null;
  identity.displayName = name;
  persist(identity);
  return identity;
}

/** Full local wipe — used by "delete account" in settings. Nothing to tell a server. */
export function destroyIdentity() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.clear();
}

export function getSecretKeyBytes() {
  const identity = getStoredIdentity();
  if (!identity) throw new Error("no_identity");
  return hexToBytes(identity.secretKeyHex);
}

function persist(identity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
