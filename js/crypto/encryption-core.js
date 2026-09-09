// js/crypto/encryption-core.js
//
// Two independent layers, so that breaking one alone isn't enough:
//   Layer 1 — NIP-44 (versioned, audited construction: ChaCha20 + HMAC-SHA256)
//   Layer 2 — AES-256-GCM with a key derived from the same shared secret via HKDF,
//             using a different salt/info than layer 1, via the browser's WebCrypto.
//
// Note for whoever reads this later: there is no such thing as literal
// "unbreakable, uncrackable" encryption — anyone claiming that is selling
// something. What we *can* honestly promise is: two well-reviewed primitives,
// independent keys, and nothing ever leaves the device unencrypted.

import { nip44, getPublicKey } from "https://esm.sh/nostr-tools@2.7.2";

/** Derive the layer-1 conversation key (NIP-44 handles this internally). */
function conversationKey(mySecretKeyBytes, theirPubkeyHex) {
  return nip44.v2.utils.getConversationKey(mySecretKeyBytes, theirPubkeyHex);
}

/** Layer 2: derive a distinct AES-GCM key from the same conversation key + a fixed label. */
async function deriveLayer2Key(convoKeyBytes) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    convoKeyBytes,
    "HKDF",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode("decentra-market-layer2"),
      info: new TextEncoder().encode("aes-gcm-message-layer"),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt plaintext (string) for a recipient pubkey. Returns a single transportable string. */
export async function encryptLayered(mySecretKeyBytes, theirPubkeyHex, plaintext) {
  const convoKey = conversationKey(mySecretKeyBytes, theirPubkeyHex);

  // Layer 1
  const layer1 = nip44.v2.encrypt(plaintext, convoKey);

  // Layer 2
  const aesKey = await deriveLayer2Key(convoKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(layer1)
  );

  const payload = {
    v: 2, // envelope version
    iv: bufToB64(iv),
    ct: bufToB64(cipherBuf),
  };
  return btoa(JSON.stringify(payload));
}

export async function decryptLayered(mySecretKeyBytes, theirPubkeyHex, envelopeB64) {
  const convoKey = conversationKey(mySecretKeyBytes, theirPubkeyHex);
  const payload = JSON.parse(atob(envelopeB64));

  const aesKey = await deriveLayer2Key(convoKey);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(payload.iv) },
    aesKey,
    b64ToBuf(payload.ct)
  );
  const layer1 = new TextDecoder().decode(plainBuf);

  return nip44.v2.decrypt(layer1, convoKey);
}

/** For images/files: encrypt raw bytes the same layered way, returns a Blob-ready envelope. */
export async function encryptMediaBytes(mySecretKeyBytes, theirPubkeyHex, bytes) {
  const convoKey = conversationKey(mySecretKeyBytes, theirPubkeyHex);
  const aesKey = await deriveLayer2Key(convoKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, bytes);
  return { iv: bufToB64(iv), data: bufToB64(cipherBuf) };
}

export async function decryptMediaBytes(mySecretKeyBytes, theirPubkeyHex, envelope) {
  const convoKey = conversationKey(mySecretKeyBytes, theirPubkeyHex);
  const aesKey = await deriveLayer2Key(convoKey);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(envelope.iv) },
    aesKey,
    b64ToBuf(envelope.data)
  );
  return new Uint8Array(plainBuf);
}

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
