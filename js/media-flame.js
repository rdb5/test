/**
 * media-flame.js
 * -----------------------------------------------------------------------
 * "Flame" media = Snapchat-style disappearing photos/videos:
 *   - Hidden by default (shown as a flame icon, not the content)
 *   - Only rendered when the recipient taps it
 *   - Disappears after `seconds` OR after `maxViews` opens, whichever
 *     the sender configured
 *   - The Blob/ObjectURL is revoked and dereferenced the moment it
 *     expires - it is never written to disk
 *
 * HONEST LIMITATION: There is no reliable, cross-platform way for a web
 * page / PWA to detect or block a screenshot or screen recording. iOS
 * Safari and Android Chrome do not expose a "user took a screenshot"
 * event to web content. We implement best-effort *hints* (below) but we
 * do not claim they stop a determined second device/camera or a
 * screen recorder. Please tell your users this plainly - promising
 * "undetectable screenshot blocking" on the web would be dishonest.
 * -----------------------------------------------------------------------
 */

class FlameViewer {
  /**
   * @param {object} msg - a MSG_FLAME message object from chat-ephemeral.js
   * @param {function} onExpire - called once the media has fully expired
   * @param {function} onScreenshotSuspected - best-effort heuristic callback
   */
  constructor(msg, onExpire, onScreenshotSuspected) {
    this.msg = msg;
    this.onExpire = onExpire;
    this.onScreenshotSuspected = onScreenshotSuspected;
    this.viewsUsed = msg.viewed || 0;
    this.timer = null;
    this._bindHeuristics();
  }

  canOpen() {
    const maxViews = this.msg.flame?.maxViews ?? 1;
    return this.viewsUsed < maxViews;
  }

  open(renderCallback) {
    if (!this.canOpen()) return false;
    this.viewsUsed++;
    this.msg.viewed = this.viewsUsed;

    const url = this.msg.blobUrl || URL.createObjectURL(this.msg.blob);
    this.msg.blobUrl = url;
    renderCallback(url, this.msg.mime);

    const seconds = this.msg.flame?.seconds ?? 8;
    this.timer = setTimeout(() => this._expireNow(), seconds * 1000);
    return true;
  }

  _expireNow() {
    clearTimeout(this.timer);
    if (this.msg.blobUrl) { URL.revokeObjectURL(this.msg.blobUrl); this.msg.blobUrl = null; }
    this.msg.blob = null;
    this.msg.expired = !this.canOpen();
    this.onExpire && this.onExpire(this.msg);
    this._unbindHeuristics();
  }

  closeEarly() { this._expireNow(); }

  /** Best-effort screenshot/recording heuristics (NOT guaranteed detection). */
  _bindHeuristics() {
    this._visHandler = () => {
      if (document.visibilityState === 'hidden') {
        // App/tab backgrounded while flame content open - treat as a
        // possible capture attempt and burn the view immediately.
        this.onScreenshotSuspected && this.onScreenshotSuspected('visibility-change');
        this._expireNow();
      }
    };
    document.addEventListener('visibilitychange', this._visHandler);

    // Screen Capture API: if the OS/browser ever reports an active
    // capture session we can react - support for this is inconsistent
    // and many platforms will never fire it. Best effort only.
    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      try {
        this._captureWatcher = setInterval(() => {
          if (document.pictureInPictureElement) {
            this.onScreenshotSuspected && this.onScreenshotSuspected('pip-detected');
          }
        }, 1000);
      } catch (e) {}
    }
  }
  _unbindHeuristics() {
    document.removeEventListener('visibilitychange', this._visHandler);
    if (this._captureWatcher) clearInterval(this._captureWatcher);
  }
}

window.FlameViewer = FlameViewer;
