/**
 * store.js
 * -----------------------------------------------------------------------
 * The ONLY things this app ever writes to persistent storage (IndexedDB)
 * are:
 *   1. Your own identity keypair (so you don't lose your "phone number")
 *   2. Your contact list: {pubkey, name, lastSeen}  -- no chat content
 *   3. A blocklist of pubkeys
 *   4. A list of "consumed" one-time QR tokens (so they can't be reused)
 *   5. UI preferences (e.g. relay list)
 *
 * MESSAGE CONTENT / MEDIA IS NEVER WRITTEN HERE. It lives only in a
 * JS variable in chat-ephemeral.js / media-flame.js and is wiped the
 * moment the chat closes. There is no table for it, on purpose.
 * -----------------------------------------------------------------------
 */

const DB_NAME = 'ghost-p2p-db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('identity')) db.createObjectStore('identity', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('contacts')) db.createObjectStore('contacts', { keyPath: 'pubkey' });
      if (!db.objectStoreNames.contains('blocklist')) db.createObjectStore('blocklist', { keyPath: 'pubkey' });
      if (!db.objectStoreNames.contains('usedTokens')) db.createObjectStore('usedTokens', { keyPath: 'token' });
      if (!db.objectStoreNames.contains('prefs')) db.createObjectStore('prefs', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = fn(store);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
  });
}

const Store = {
  // ---- Identity ----
  async saveIdentity(identity) {
    return tx('identity', 'readwrite', (s) => s.put({ id: 'me', ...identity }));
  },
  async getIdentity() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction('identity', 'readonly');
      const req = t.objectStore('identity').get('me');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async wipeIdentity() {
    return tx('identity', 'readwrite', (s) => s.delete('me'));
  },

  // ---- Contacts (name + pubkey + presence only) ----
  async upsertContact(contact) {
    return tx('contacts', 'readwrite', (s) => s.put(contact));
  },
  async getContact(pubkey) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction('contacts', 'readonly').objectStore('contacts').get(pubkey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async allContacts() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction('contacts', 'readonly').objectStore('contacts').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },
  async deleteContact(pubkey) {
    return tx('contacts', 'readwrite', (s) => s.delete(pubkey));
  },

  // ---- Blocklist ----
  async block(pubkey) {
    return tx('blocklist', 'readwrite', (s) => s.put({ pubkey, at: Date.now() }));
  },
  async unblock(pubkey) {
    return tx('blocklist', 'readwrite', (s) => s.delete(pubkey));
  },
  async isBlocked(pubkey) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction('blocklist', 'readonly').objectStore('blocklist').get(pubkey);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async allBlocked() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction('blocklist', 'readonly').objectStore('blocklist').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // ---- One-time QR token tracking (prevents replay/reuse) ----
  async markTokenUsed(token) {
    return tx('usedTokens', 'readwrite', (s) => s.put({ token, at: Date.now() }));
  },
  async isTokenUsed(token) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction('usedTokens', 'readonly').objectStore('usedTokens').get(token);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
    });
  },

  // ---- Preferences (e.g. relay URLs) ----
  async setPref(key, value) {
    return tx('prefs', 'readwrite', (s) => s.put({ key, value }));
  },
  async getPref(key, fallback = null) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction('prefs', 'readonly').objectStore('prefs').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : fallback);
      req.onerror = () => reject(req.error);
    });
  },

  // ---- Nuke everything (full self-destruct of account) ----
  async wipeEverything() {
    const db = await openDB();
    const names = ['identity', 'contacts', 'blocklist', 'usedTokens', 'prefs'];
    return Promise.all(names.map(name => new Promise((resolve, reject) => {
      const req = db.transaction(name, 'readwrite').objectStore(name).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    })));
  }
};

window.Store = Store;
