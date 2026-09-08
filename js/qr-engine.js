/**
 * qr-engine.js
 * -----------------------------------------------------------------------
 * Generates a ONE-TIME connection code and scans one from camera or an
 * uploaded image. The QR encodes:
 *   { v:1, pub: myPubkeyHex, name: myDisplayName, token: randomOneTimeToken,
 *     relays: [...] }
 *
 * The token is generated fresh every time you open "New Contact" and is
 * marked as consumed (Store.markTokenUsed) the FIRST time anyone
 * completes a handshake using it - after that, this device will ignore
 * any further handshake attempts that reference it, so the same photo
 * of the QR code cannot be reused to add you again, and someone you
 * later block cannot use their old copy of it to reappear.
 *
 * No account, phone number, or server registry is required to use this
 * - the QR contains everything needed for a fully peer-to-peer
 * handshake over Nostr relays.
 * -----------------------------------------------------------------------
 */

const QRCodeLib = window.QRCode; // from cdn qrcode.js
// jsQR loaded from CDN for scanning

const QREngine = {
  /** Generates a fresh one-time token + QR payload for "add me" flow. */
  async generateConnectPayload(identity, relays) {
    const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
    const payload = {
      v: 1,
      pub: identity.pubkeyHex,
      name: identity.name,
      token,
      relays
    };
    return { payload, token, encoded: btoa(unescape(encodeURIComponent(JSON.stringify(payload)))) };
  },

  renderToCanvas(canvasEl, encodedString) {
    canvasEl.innerHTML = '';
    new QRCodeLib(canvasEl, {
      text: `ghost://connect/${encodedString}`,
      width: 260,
      height: 260,
      colorDark: '#00ffc8',
      colorLight: '#00000000',
      correctLevel: QRCodeLib.CorrectLevel.M
    });
  },

  decode(encodedString) {
    try {
      const json = decodeURIComponent(escape(atob(encodedString)));
      const payload = JSON.parse(json);
      if (!payload.pub || !payload.token) throw new Error('bad payload');
      return payload;
    } catch (e) {
      return null;
    }
  },

  extractFromScannedText(text) {
    const match = text.match(/ghost:\/\/connect\/([A-Za-z0-9+/=]+)/);
    const encoded = match ? match[1] : text; // allow raw base64 too
    return this.decode(encoded);
  },

  /** Scan from a live camera video element using jsQR each animation frame. */
  startCameraScan(videoEl, canvasHidden, onFound) {
    let running = true;
    const ctx = canvasHidden.getContext('2d', { willReadFrequently: true });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => {
      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', true);
      videoEl.play();
      const tick = () => {
        if (!running) return;
        if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
          canvasHidden.width = videoEl.videoWidth;
          canvasHidden.height = videoEl.videoHeight;
          ctx.drawImage(videoEl, 0, 0, canvasHidden.width, canvasHidden.height);
          const imageData = ctx.getImageData(0, 0, canvasHidden.width, canvasHidden.height);
          const code = window.jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            const payload = QREngine.extractFromScannedText(code.data);
            if (payload) { onFound(payload); }
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { stop: () => {
      running = false;
      const stream = videoEl.srcObject;
      if (stream) stream.getTracks().forEach(t => t.stop());
    }};
  },

  /** Scan a QR from an uploaded image file instead of the camera. */
  scanFromImageFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (!code) return reject(new Error('لم يتم العثور على رمز QR في الصورة'));
        const payload = QREngine.extractFromScannedText(code.data);
        if (!payload) return reject(new Error('رمز QR غير صالح'));
        resolve(payload);
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

window.QREngine = QREngine;
