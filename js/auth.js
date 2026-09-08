/**
 * auth.js
 * -----------------------------------------------------------------------
 * Generates a Nostr-compatible secp256k1 identity ENTIRELY on-device.
 * The private key never leaves this device, is never transmitted to any
 * relay or server, and is only used locally to:
 *   - sign the tiny signaling envelopes sent over Nostr relays
 *   - derive a shared secret (ECDH, NIP-44) with each contact for E2E
 *     encryption of both the signaling data and, again, the app-layer
 *     message encryption on top of the already-encrypted WebRTC channel.
 * -----------------------------------------------------------------------
 */

import * as NostrTools from 'https://esm.sh/nostr-tools@2.10.4';

const Auth = {
  async generateIdentity(displayName) {
    const sk = NostrTools.generateSecretKey(); // Uint8Array
    const pk = NostrTools.getPublicKey(sk);    // hex string

    const identity = {
      name: displayName,
      privkey: NostrTools.nip19.nsecEncode(sk), // stored encoded, local only
      privkeyHex: bytesToHex(sk),
      pubkeyHex: pk,
      npub: NostrTools.nip19.npubEncode(pk),
      createdAt: Date.now()
    };
    await Store.saveIdentity(identity);
    return identity;
  },

  async loadIdentity() {
    return await Store.getIdentity();
  },

  async renameIdentity(newName) {
    const id = await Store.getIdentity();
    if (!id) return null;
    id.name = newName;
    await Store.saveIdentity(id);
    return id;
  },

  secretKeyBytes(identity) {
    return hexToBytes(identity.privkeyHex);
  }
};

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

window.Auth = Auth;
window.NostrTools = NostrTools;
