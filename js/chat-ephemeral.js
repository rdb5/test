/**
 * chat-ephemeral.js
 * -----------------------------------------------------------------------
 * Owns the live conversation state. Everything here lives in a plain JS
 * array in memory (`this.messages`). Nothing is written to localStorage,
 * IndexedDB, cookies, or disk. When the chat is closed - by navigating
 * away, closing the tab, backgrounding the app, or the peer disconnecting
 * - `destroy()` runs and the array is discarded and dereferenced so the
 * garbage collector reclaims it. There is nothing left to recover.
 *
 * On top of WebRTC's own DTLS transport encryption, every message is
 * additionally encrypted app-side with a NIP-44 derived shared secret
 * between the two identities, so even a compromised TURN relay (see
 * webrtc-p2p.js note) only ever sees ciphertext.
 * -----------------------------------------------------------------------
 */

const MSG_TEXT = 'text';
const MSG_FILE = 'file';
const MSG_FLAME = 'flame';
const MSG_RECEIPT = 'receipt';

class EphemeralChat {
  constructor({ identity, contact, p2p, signal }) {
    this.identity = identity;
    this.contact = contact; // {pubkey, name}
    this.p2p = p2p;
    this.signal = signal;
    this.messages = []; // IN MEMORY ONLY. Never persisted.
    this.listeners = [];
    this.destroyed = false;

    this.convKey = NostrTools.nip44.v2.utils.getConversationKey(
      hexToBytes(identity.privkeyHex), contact.pubkey
    );

    this.p2p.onData = (raw) => this._handleIncoming(raw);
    this.p2p.onClose = () => this._handlePeerLeft();

    // "bye" from the peer (they exited the chat) wipes our side too
    this._byeHandler = (payload) => {
      if (payload.from === contact.pubkey) this._handlePeerLeft();
    };
    signal.on(SIGNAL_KINDS.KIND_BYE, this._byeHandler);
  }

  onUpdate(cb) { this.listeners.push(cb); }
  _notify() { this.listeners.forEach(cb => cb(this.messages)); }

  _encrypt(plaintext) {
    return NostrTools.nip44.v2.encrypt(plaintext, this.convKey);
  }
  _decrypt(ciphertext) {
    return NostrTools.nip44.v2.decrypt(ciphertext, this.convKey);
  }

  sendText(text) {
    const msg = { id: cryptoId(), type: MSG_TEXT, from: 'me', text, ts: Date.now() };
    const envelope = JSON.stringify({ t: MSG_TEXT, text });
    this.p2p.send(this._encrypt(envelope));
    this.messages.push(msg);
    this._notify();
  }

  /**
   * Send a file or image. `allowDownload` controls whether the recipient
   * gets a save/download button at all. `flame` (optional) enables
   * view-once/limited-view/self-destruct-timer semantics.
   */
  async sendMedia(fileBlob, { allowDownload = true, flame = null } = {}) {
    const buf = await fileBlob.arrayBuffer();
    const meta = {
      t: MSG_FILE,
      name: fileBlob.name || 'file',
      mime: fileBlob.type || 'application/octet-stream',
      size: buf.byteLength,
      allowDownload,
      flame // { maxViews, seconds } or null
    };
    // header first (encrypted JSON), then binary chunks (each individually
    // encrypted) so the transport never carries a single unencrypted byte
    const headerCipher = this._encrypt(JSON.stringify({ ...meta, header: true, mid: meta.mid = cryptoId() }));
    this.p2p.send(headerCipher);

    const CHUNK = 16 * 1024;
    for (let off = 0; off < buf.byteLength; off += CHUNK) {
      const chunk = buf.slice(off, off + CHUNK);
      const b64 = arrayBufferToBase64(chunk);
      const cipher = this._encrypt(JSON.stringify({ t: 'chunk', mid: meta.mid, data: b64, last: off + CHUNK >= buf.byteLength }));
      this.p2p.send(cipher);
    }

    const localMsg = {
      id: meta.mid, type: flame ? MSG_FLAME : MSG_FILE, from: 'me',
      name: meta.name, mime: meta.mime, size: meta.size,
      allowDownload, flame, blobUrl: URL.createObjectURL(fileBlob), ts: Date.now()
    };
    this.messages.push(localMsg);
    this._notify();
  }

  _handleIncoming(raw) {
    let plaintext;
    try { plaintext = this._decrypt(raw); } catch (e) { return; } // undecryptable -> drop
    let payload;
    try { payload = JSON.parse(plaintext); } catch (e) { return; }

    if (payload.t === MSG_TEXT) {
      this.messages.push({ id: cryptoId(), type: MSG_TEXT, from: 'them', text: payload.text, ts: Date.now() });
      this._notify();
    } else if (payload.header) {
      this._incomingFiles = this._incomingFiles || {};
      this._incomingFiles[payload.mid] = { meta: payload, chunks: [] };
    } else if (payload.t === 'chunk') {
      const f = (this._incomingFiles || {})[payload.mid];
      if (!f) return;
      f.chunks.push(base64ToArrayBuffer(payload.data));
      if (payload.last) {
        const blob = new Blob(f.chunks, { type: f.meta.mime });
        const msg = {
          id: payload.mid, type: f.meta.flame ? MSG_FLAME : MSG_FILE, from: 'them',
          name: f.meta.name, mime: f.meta.mime, size: f.meta.size,
          allowDownload: f.meta.allowDownload, flame: f.meta.flame,
          blob, blobUrl: null, viewed: 0, ts: Date.now()
        };
        this.messages.push(msg);
        delete this._incomingFiles[payload.mid];
        this._notify();
      }
    } else if (payload.t === 'receipt') {
      this.messages.push({ id: cryptoId(), type: MSG_RECEIPT, text: payload.text, ts: Date.now() });
      this._notify();
    }
  }

  /** Notify the sender that I downloaded/saved their media. */
  notifyDownloaded(msgId, fileName) {
    const envelope = JSON.stringify({ t: 'receipt', text: `${this.contact.name || 'Contact'} downloaded "${fileName}"` });
    this.p2p.send(this._encrypt(envelope));
  }

  /** Peer disconnected or sent "bye": wipe this side immediately too. */
  _handlePeerLeft() {
    if (this.destroyed) return;
    this._wipeAllBlobUrls();
    this.messages = [];
    this._notify();
    this.destroyed = true;
    if (this._onPeerLeftExternal) this._onPeerLeftExternal();
  }

  _wipeAllBlobUrls() {
    for (const m of this.messages) {
      if (m.blobUrl) URL.revokeObjectURL(m.blobUrl);
    }
  }

  /** Call this when the local user exits the chat / closes the app. */
  destroy(notifyPeer = true) {
    if (this.destroyed) return;
    this.destroyed = true;
    this._wipeAllBlobUrls();
    this.messages.length = 0; // drop all references
    this.messages = null;
    this.signal.handlers[SIGNAL_KINDS.KIND_BYE] =
      (this.signal.handlers[SIGNAL_KINDS.KIND_BYE] || []).filter(h => h !== this._byeHandler);
    if (notifyPeer) this.p2p.hangup();
  }
}

function cryptoId() { return crypto.randomUUID(); }
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}
function arrayBufferToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

window.EphemeralChat = EphemeralChat;
window.MSG_TYPES = { MSG_TEXT, MSG_FILE, MSG_FLAME, MSG_RECEIPT };
