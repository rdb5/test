/**
 * webrtc-p2p.js
 * -----------------------------------------------------------------------
 * This is where actual chat content travels. Once a connection is
 * established, text, images, video and files go DIRECTLY over an
 * RTCDataChannel from one phone to the other. WebRTC data channels are
 * natively encrypted with DTLS, and on top of that we add our own
 * NIP-44-derived application-layer encryption (see chat-ephemeral.js)
 * so the payload is double-encrypted end-to-end.
 *
 * HONEST NOTE ON NAT TRAVERSAL:
 * We use public STUN servers to discover a direct path between the two
 * phones. On many home/mobile networks this succeeds and the two
 * devices talk directly with zero intermediary. On some networks
 * (symmetric NAT, strict carrier-grade NAT, some corporate firewalls)
 * a direct path is impossible and WebRTC MUST relay encrypted packets
 * through a TURN server to get through. If you add a TURN server below,
 * understand that a TURN relay *touches* your encrypted packets in
 * transit (it cannot read them - DTLS + our own encryption still
 * protects content - but it is not literally "phone to phone" in that
 * fallback case). We ship with STUN only by default; add your own TURN
 * server in settings.html if you need higher connection reliability.
 * -----------------------------------------------------------------------
 */

class P2PConnection {
  /**
   * @param {object} opts
   * @param {string} opts.peerPubkey - the contact's Nostr pubkey (hex)
   * @param {NostrSignal} opts.signal - signaling channel instance
   * @param {function} opts.onData - called with (ArrayBuffer|string) on incoming data channel message
   * @param {function} opts.onOpen - called when data channel opens (connected)
   * @param {function} opts.onClose - called when connection closes
   * @param {string[]} [opts.turnServers]
   */
  constructor({ peerPubkey, signal, onData, onOpen, onClose, turnServers = [] }) {
    this.peerPubkey = peerPubkey;
    this.signal = signal;
    this.onData = onData;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.pc = null;
    this.dc = null;
    this.connected = false;

    this.iceServers = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      ...turnServers.map(t => ({ urls: t.url, username: t.username, credential: t.credential }))
    ];

    // listen for signaling envelopes addressed to us from this specific peer
    this._sigHandler = (payload) => {
      if (payload.from !== this.peerPubkey) return;
      this._handleSignal(payload);
    };
    this.signal.on(SIGNAL_KINDS.KIND_SIGNAL, this._sigHandler);
  }

  _makePC() {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.signal.sendSignal(this.peerPubkey, { type: 'candidate', candidate: e.candidate });
      }
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        this._teardown(false);
      }
    };
    pc.ondatachannel = (e) => this._bindDataChannel(e.channel);
    return pc;
  }

  _bindDataChannel(dc) {
    dc.binaryType = 'arraybuffer';
    this.dc = dc;
    dc.onopen = () => { this.connected = true; this.onOpen && this.onOpen(); };
    dc.onclose = () => { this.connected = false; this.onClose && this.onClose(); };
    dc.onmessage = (e) => this.onData && this.onData(e.data);
  }

  /** Caller side: I pressed "call" / opened the chat first. */
  async initiate() {
    this.pc = this._makePC();
    const dc = this.pc.createDataChannel('ghost', { ordered: true });
    this._bindDataChannel(dc);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.signal.sendSignal(this.peerPubkey, { type: 'offer', sdp: offer.sdp });
  }

  async _handleSignal(payload) {
    if (payload.type === 'offer') {
      if (!this.pc) this.pc = this._makePC();
      await this.pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this.signal.sendSignal(this.peerPubkey, { type: 'answer', sdp: answer.sdp });
    } else if (payload.type === 'answer') {
      if (this.pc) await this.pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
    } else if (payload.type === 'candidate') {
      if (this.pc) {
        try { await this.pc.addIceCandidate(payload.candidate); } catch (e) { /* ignore late candidates */ }
      }
    }
  }

  send(data) {
    if (this.dc && this.dc.readyState === 'open') this.dc.send(data);
  }

  /** Tear down and wipe. Optionally notify the peer via a "bye" signal. */
  _teardown(notifyPeer = true) {
    if (notifyPeer) {
      try { this.signal.sendBye(this.peerPubkey); } catch (e) {}
    }
    if (this.dc) { try { this.dc.close(); } catch (e) {} this.dc = null; }
    if (this.pc) { try { this.pc.close(); } catch (e) {} this.pc = null; }
    this.connected = false;
    this.signal.handlers[SIGNAL_KINDS.KIND_SIGNAL] =
      (this.signal.handlers[SIGNAL_KINDS.KIND_SIGNAL] || []).filter(h => h !== this._sigHandler);
    this.onClose && this.onClose();
  }

  hangup() { this._teardown(true); }
}

window.P2PConnection = P2PConnection;
