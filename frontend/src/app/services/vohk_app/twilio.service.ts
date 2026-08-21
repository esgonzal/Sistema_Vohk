import { Injectable } from '@angular/core';
import { Call, Device } from '@twilio/voice-sdk';
import { AuthService } from './auth.service';
import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TwilioService {

  private device?: Device;
  private initialization?: Promise<void>;
  private incomingCallSubject = new BehaviorSubject<Call | null>(null);
  readonly incomingCall$ = this.incomingCallSubject.asObservable();
  private callEndedSubject = new Subject<void>();
  readonly callEnded$ = this.callEndedSubject.asObservable();
  private activeCall?: Call;
  private remoteAudio?: HTMLAudioElement;

  constructor(private authService: AuthService) { }

  initialize(): Promise<void> {
    if (this.device) {
      return Promise.resolve();
    }
    if (this.initialization) {
      return this.initialization;
    }
    this.initialization = this.initializeDevice().finally(() => {
      this.initialization = undefined;
    });
    return this.initialization;
  }

  private async initializeDevice(): Promise<void> {
    const response = await firstValueFrom(this.authService.getTwilioToken());
    if (!response?.token) {
      throw new Error('Backend did not return a Twilio access token.');
    }
    const device = new Device(response.token);
    this.device = device;
    device.on('registered', () => {
      console.log(`Twilio registered as ${device.identity}.`);
    });
    device.on('error', (error) => {
      console.error('Twilio Device error:', {
        code: error.code,
        message: error.message,
        causes: error.causes,
        solutions: error.solutions,
        originalError: error.originalError,
      });
    });
    device.on('incoming', (call: Call) => {
      this.incomingCallSubject.next(call);
      const clearIncomingCall = () => {
        if (this.incomingCallSubject.value === call) {
          this.incomingCallSubject.next(null);
        }
      };
      call.on('cancel', () => {
        clearIncomingCall();
        this.callEndedSubject.next();
      });
      call.on('disconnect', () => {
        clearIncomingCall();
        this.callEndedSubject.next();
      });
      call.on('error', error => {
        console.error('Incoming Twilio call error:', error);
        clearIncomingCall();
        this.callEndedSubject.next();
      });
    });
    device.on('tokenWillExpire', async () => {
      try {
        const refreshed = await firstValueFrom(this.authService.getTwilioToken());
        if (!refreshed?.token) {
          throw new Error('Backend did not return a renewed Twilio token.');
        }
        device.updateToken(refreshed.token);
      } catch (error) {
        console.error('Unable to renew Twilio access token:', error);
      }
    });
    await device.register();
  }

  clearIncomingCall(): void {
    this.incomingCallSubject.next(null);
  }

  shutdown(): void {
    this.incomingCallSubject.value?.reject();
    this.incomingCallSubject.next(null);
    this.device?.destroy();
    this.device = undefined;
    this.initialization = undefined;
  }

  async call(identity: string): Promise<Call> {
    if (!this.device) {
      throw new Error('Twilio is not initialized');
    }
    if (this.activeCall) {
      throw new Error('There is already an active call');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    const call = await this.device.connect({
      params: { To: identity }
    });
    this.activeCall = call;
    this.registerCallEvents(call);
    return call;
  }

  disconnectCall(): void {
    this.activeCall?.disconnect();
  }

  private registerCallEvents(call: Call): void {
    call.on('audio', (audio: HTMLAudioElement) => {
      this.remoteAudio = audio;
      audio.muted = false;
      audio.volume = 1;
    });
    call.on('disconnect', () => {
      console.log('Twilio call disconnected');
      this.remoteAudio = undefined;
      if (this.activeCall === call) {
        this.activeCall = undefined;
      }
      this.callEndedSubject.next();
    });
    call.on('error', error => {
      console.error('Twilio call error:', error);
      this.remoteAudio = undefined;
      if (this.activeCall === call) {
        this.activeCall = undefined;
      }
      this.callEndedSubject.next();
    });
  }
}