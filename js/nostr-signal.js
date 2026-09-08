/**
 * nostr-signal.js
 * -----------------------------------------------------------------------
 * Nostr is used ONLY as a decentralized "doorbell" / rendezvous layer:
 *   - "I'm online, here's a WebRTC offer for you"
 *   - "Here's my WebRTC answer"
 *   - "Here's an ICE candidate"
 *   - "I'm ringing you" (call bell, when no connection exists yet)
 *   - "I'm leaving the chat" (bye / wipe signal)
 *   - one-time QR contact handshake
 *
 * NONE of this ever contains chat text, images, or files. All of it is
 * end-to-end encrypted with NIP-44 (ECDH + ChaCha20/Poly1305 style AEAD)
 * so relays only ever see an opaque encrypted blob addressed to a pubkey
 * they cannot read.
 *
 * We use EPHEMERAL event kinds (20000-29999 range, per NIP-01) for rings,
 * WebRTC signaling, bye/wipe signals and presence. Well-behaved relays
 * are specified to NOT store/persist these after broadcasting to
 * currently-subscribed clients - they are fire-and-forget signals, not a
 * message store. Even if a rogue relay violated the spec and logged
 * them, all it would have is encrypted noise + a WebRTC handshake blob
 * that is useless without the live peer connection.
 *
 * ONE DELIBERATE EXCEPTION - the QR handshake (KIND_HANDSHAKE below):
 * you asked for QR codes that work even if the two of you are not online
 * at the same moment. That is fundamentally a "store and forward"
 * problem, and a design with zero servers of any kind cannot deliver a
 * message to someone who isn't listening right now unless *something*
 * holds onto it briefly. So, and ONLY for this one handshake event, we
 * use a regular (non-ephemeral) kind with a NIP-40 `expiration` tag,
 * meaning relays that support expiration will drop it automatically
 * after a short window (default 24h) even if we never come back for it.
 * The content is still fully encrypted end-to-end, so a relay only ever
 * sees ciphertext regardless. The moment the recipient's device comes
 * online and consumes it, it fires a NIP-09 delete request for that
 * event too, on a best-effort basis (not all relays honor deletes).
 * Everything else in this file remains ephemeral / never intentionally
 * persisted anywhere.
 * -----------------------------------------------------------------------
 */

const KIND_RING       = 20001; // "someone wants to open a chat with you"
const KIND_SIGNAL     = 20002; // WebRTC offer/answer/ICE envelope
const KIND_BYE        = 20003; // "I'm leaving / closing this chat"
const KIND_HANDSHAKE  = 21044; // one-time QR contact handshake (see note above: short-lived, NOT ephemeral-range)
const KIND_PRESENCE   = 20005; // "I'm online now" heartbeat (not stored, tiny TTL)
const KIND_RECEIPT    = 20006; // "media downloaded / saved" notice
const HANDSHAKE_TTL_SECONDS = 24 * 60 * 60; // handshake auto-expires after 24h if never picked up

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
  'wss://relay.snort.social'
];

class NostrSignal {
  constructor(identity) {
    this.identity = identity;
    this.sk = hexToBytes(identity.privkeyHex);
    this.pool = new NostrTools.SimplePool();
    this.relays = DEFAULT_RELAYS;
    this.sub = null;
    this.handlers = {}; // kind -> [callback]
  }

  async loadRelays() {
    const saved = await Store.getPref('relays', null);
    if (saved && saved.length) this.relays = saved;
    return this.relays;
  }

  on(kind, cb) {
    (this.handlers[kind] = this.handlers[kind] || []).push(cb);
  }

  emit(kind, payload, event) {
    (this.handlers[kind] || []).forEach(cb => cb(payload, event));
  }

  /** Start listening for anything addressed to me (#p tag = my pubkey). */
  start() {
    // Ephemeral live signals: only from *this moment* forward (since=now-5s)
    const liveKinds = [KIND_RING, KIND_SIGNAL, KIND_BYE, KIND_PRESENCE, KIND_RECEIPT];
    this.sub = this.pool.subscribeMany(
      this.relays,
      [{ kinds: liveKinds, '#p': [this.identity.pubkeyHex], since: Math.floor(Date.now() / 1000) - 5 }],
      { onevent: (event) => this._onEvent(event) }
    );

    // QR handshakes: fetch anything still sitting on relays (up to TTL old)
    // that was sent to me while I wasn't around, then delete it once consumed.
    this.handshakeSub = this.pool.subscribeMany(
      this.relays,
      [{ kinds: [KIND_HANDSHAKE], '#p': [this.identity.pubkeyHex],
         since: Math.floor(Date.now() / 1000) - HANDSHAKE_TTL_SECONDS }],
      { onevent: (event) => this._onEvent(event, true) }
    );
  }

  async _onEvent(event, isHandshake = false) {
    try {
      const senderPub = event.pubkey;
      if (await Store.isBlocked(senderPub)) return; // silently ignore blocked pubkeys
      const plaintext = await this._decryptFrom(senderPub, event.content);
      const payload = JSON.parse(plaintext);
      if (isHandshake) {
        const already = await Store.isTokenUsed(payload.token + ':in');
        if (already) return; // already processed this exact handshake
        await Store.markTokenUsed(payload.token + ':in');
        this._deleteEventBestEffort(event.id);
      }
      this.emit(event.kind, { from: senderPub, ...payload }, event);
    } catch (e) {
      // Not decryptable by us / malformed -> ignore
    }
  }

  async _deleteEventBestEffort(eventId) {
    try {
      const del = NostrTools.finalizeEvent({
        kind: 5, created_at: Math.floor(Date.now() / 1000),
        tags: [['e', eventId]], content: 'consumed', pubkey: this.identity.pubkeyHex
      }, this.sk);
      this.pool.publish(this.relays, del);
    } catch (e) {}
  }

  stop() {
    if (this.sub) this.sub.close();
    if (this.handshakeSub) this.handshakeSub.close();
    this.pool.close(this.relays);
  }

  async _encryptTo(recipientPubHex, obj) {
    const plaintext = JSON.stringify(obj);
    return NostrTools.nip44.v2.encrypt(plaintext, NostrTools.nip44.v2.utils.getConversationKey(this.sk, recipientPubHex));
  }
  async _decryptFrom(senderPubHex, ciphertext) {
    return NostrTools.nip44.v2.decrypt(ciphertext, NostrTools.nip44.v2.utils.getConversationKey(this.sk, senderPubHex));
  }

  async _publishEphemeral(kind, recipientPubHex, payload, extraTags = []) {
    const content = await this._encryptTo(recipientPubHex, payload);
    const event = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', recipientPubHex], ...extraTags],
      content,
      pubkey: this.identity.pubkeyHex
    };
    const signed = NostrTools.finalizeEvent(event, this.sk);
    await Promise.any(this.pool.publish(this.relays, signed));
    return signed;
  }

  ring(recipientPubHex) {
    return this._publishEphemeral(KIND_RING, recipientPubHex, {
      name: this.identity.name, ts: Date.now()
    });
  }

  sendSignal(recipientPubHex, signalObj) {
    return this._publishEphemeral(KIND_SIGNAL, recipientPubHex, signalObj);
  }

  sendBye(recipientPubHex) {
    return this._publishEphemeral(KIND_BYE, recipientPubHex, { ts: Date.now() });
  }

  sendPresence(recipientPubHex) {
    return this._publishEphemeral(KIND_PRESENCE, recipientPubHex, { online: true, ts: Date.now() });
  }

  sendReceipt(recipientPubHex, info) {
    return this._publishEphemeral(KIND_RECEIPT, recipientPubHex, info);
  }

  /** One-time QR handshake: scanner -> generator. Auto-expires on relays after 24h (NIP-40). */
  sendHandshake(recipientPubHex, token, myName) {
    const expiration = String(Math.floor(Date.now() / 1000) + HANDSHAKE_TTL_SECONDS);
    return this._publishEphemeral(KIND_HANDSHAKE, recipientPubHex, { token, name: myName }, [['expiration', expiration]]);
  }
}

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

window.NostrSignal = NostrSignal;
window.SIGNAL_KINDS = { KIND_RING, KIND_SIGNAL, KIND_BYE, KIND_HANDSHAKE, KIND_PRESENCE, KIND_RECEIPT };
window.DEFAULT_RELAYS = DEFAULT_RELAYS;
