import { Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-camera-stream',
  template: `
    <video #video autoplay muted playsinline></video>
    <button *ngIf="allowAudio" type="button" class="audio-toggle"
      (click)="toggleAudio()" [attr.aria-label]="audioMuted ? 'Activar audio' : 'Silenciar audio'"
      [title]="audioMuted ? 'Activar audio' : 'Silenciar audio'">
      <mat-icon>{{ audioMuted ? 'volume_off' : 'volume_up' }}</mat-icon>
    </button>
  `,
  styles: [`
    :host { display: block; position: relative; width: 100%; height: 100%; background: #000; }
    video { display: block; width: 100%; height: 100%; object-fit: cover; background: #000; }
    .audio-toggle {
      position: absolute; right: 12px; top: 54px; z-index: 3;
      width: 40px; height: 40px; border: 0; border-radius: 10px;
      display: grid; place-items: center; cursor: pointer;
      color: white; background: rgba(0, 0, 0, .62);
    }
    .audio-toggle:hover { background: rgba(0, 0, 0, .82); }
  `]
})
export class CameraStreamComponent implements OnChanges, OnDestroy {
  @Input() streamUrl = '';
  @Input() allowAudio = false;
  @ViewChild('video', { static: true }) video!: ElementRef<HTMLVideoElement>;
  audioMuted = true;

  private peerConnection: RTCPeerConnection | null = null;
  private sessionUrl: string | null = null;
  private generation = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private lastVideoTime = -1;
  private stalledChecks = 0;

  async ngOnChanges(): Promise<void> {
    await this.connect();
  }

  ngOnDestroy(): void {
    this.generation++;
    this.disconnect();
  }

  toggleAudio(): void {
    if (!this.allowAudio) return;
    this.audioMuted = !this.audioMuted;
    this.video.nativeElement.muted = this.audioMuted;
  }

  private whepUrl(value: string): string {
    const url = new URL(value);
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/whep`;
    return url.toString();
  }

  private waitForIceGathering(peerConnection: RTCPeerConnection): Promise<void> {
    if (peerConnection.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(resolve => {
      const listener = () => {
        if (peerConnection.iceGatheringState === 'complete') {
          peerConnection.removeEventListener('icegatheringstatechange', listener);
          resolve();
        }
      };
      peerConnection.addEventListener('icegatheringstatechange', listener);
    });
  }

  private async connect(): Promise<void> {
    const generation = ++this.generation;
    this.disconnect();
    if (!this.streamUrl) return;

    const peerConnection = new RTCPeerConnection();
    this.peerConnection = peerConnection;
    peerConnection.addTransceiver('video', { direction: 'recvonly' });
    if (this.allowAudio) {
      peerConnection.addTransceiver('audio', { direction: 'recvonly' });
    }
    peerConnection.onconnectionstatechange = () => {
      if (generation !== this.generation) return;
      if (peerConnection.connectionState === 'connected') {
        this.clearReconnectTimeout();
        return;
      }
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
        this.scheduleReconnect(generation, 2_000);
      } else if (peerConnection.connectionState === 'disconnected') {
        // A short Wi-Fi interruption can recover by itself. Reconnect only if
        // the peer remains disconnected for several seconds.
        this.scheduleReconnect(generation, 5_000);
      }
    };
    peerConnection.ontrack = event => {
      if (generation === this.generation && event.streams[0]) {
        this.video.nativeElement.srcObject = event.streams[0];
        this.video.nativeElement.muted = this.audioMuted;
      }
    };

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await this.waitForIceGathering(peerConnection);
      if (generation !== this.generation) return;

      const response = await fetch(this.whepUrl(this.streamUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: peerConnection.localDescription?.sdp || offer.sdp,
      });
      if (!response.ok) throw new Error(`WHEP request failed (${response.status})`);

      const location = response.headers.get('Location');
      this.sessionUrl = location ? new URL(location, this.whepUrl(this.streamUrl)).toString() : null;
      await peerConnection.setRemoteDescription({ type: 'answer', sdp: await response.text() });
      this.startHealthMonitor(generation);
    } catch (error) {
      if (generation === this.generation) {
        console.error('Unable to connect camera stream:', error);
        this.disconnect();
        this.scheduleReconnect(generation, 2_000);
      }
    }
  }

  private startHealthMonitor(generation: number): void {
    this.clearHealthInterval();
    this.lastVideoTime = -1;
    this.stalledChecks = 0;
    this.healthInterval = setInterval(() => {
      if (generation !== this.generation || document.visibilityState !== 'visible') return;
      if (this.peerConnection?.connectionState !== 'connected') return;

      const currentTime = this.video.nativeElement.currentTime;
      if (currentTime > this.lastVideoTime + 0.01) {
        this.lastVideoTime = currentTime;
        this.stalledChecks = 0;
        return;
      }

      this.stalledChecks++;
      if (this.stalledChecks >= 3) {
        console.warn('Camera stream stopped advancing; reconnecting.');
        this.scheduleReconnect(generation, 0);
      }
    }, 5_000);
  }

  private scheduleReconnect(generation: number, delay: number): void {
    if (this.reconnectTimeout || generation !== this.generation) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (generation === this.generation) void this.connect();
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }

  private clearHealthInterval(): void {
    if (this.healthInterval) clearInterval(this.healthInterval);
    this.healthInterval = null;
  }

  private disconnect(): void {
    this.clearReconnectTimeout();
    this.clearHealthInterval();
    const sessionUrl = this.sessionUrl;
    this.sessionUrl = null;
    if (sessionUrl) {
      fetch(sessionUrl, { method: 'DELETE', keepalive: true }).catch(() => undefined);
    }
    this.peerConnection?.close();
    this.peerConnection = null;
    if (this.video?.nativeElement) this.video.nativeElement.srcObject = null;
  }
}
