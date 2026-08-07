import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SelectedCondominium, SelectedCondominiumService } from 'src/app/services/vohk_app/selected-condominium.service';
import { DomSanitizer } from '@angular/platform-browser';
import { TwilioService } from 'src/app/services/vohk_app/twilio.service';
import { Call } from '@twilio/voice-sdk';
import { ConserjeriaService } from 'src/app/services/vohk_app/conserjeria.service';

interface Activity {
  time: string;
  condominium: string;
  event: string;
  zone: string;
  classification: string;
}

@Component({
  selector: 'app-conserjeria',
  templateUrl: './conserjeria.component.html',
  styleUrls: ['./conserjeria.component.css']
})
export class ConserjeriaComponent implements OnInit, OnDestroy {
  loading = true;
  devices: any[] = [];
  cameraDevices: any[] = [];
  selectedCondominium: SelectedCondominium | null = null;
  incomingCall: Call | null = null;
  activeCall: Call | null = null;
  incomingDevice: any = null;

  activities: Activity[] = [
    { time: '12:43', condominium: 'Condominio', event: 'Movimiento detectado', zone: 'Entrada', classification: 'Normal' },
    { time: '12:44', condominium: 'Condominio', event: 'Videoportero activo', zone: 'Hall', classification: 'Revisar' },
    { time: '12:45', condominium: 'Condominio', event: 'Puerta abierta', zone: 'Entrada', classification: 'Urgente' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private consjerjeriaService: ConserjeriaService,
    private selectedCondominiumService: SelectedCondominiumService,
    private sanitizer: DomSanitizer,
    private twilioService: TwilioService
  ) { }

  ngOnInit(): void {
    this.selectedCondominiumService.selected$.pipe(takeUntil(this.destroy$)).subscribe(condo => {
      this.selectedCondominium = condo;
      if (!condo) {
        this.loading = false;
        this.devices = [];
        this.cameraDevices = [];
        return;
      }
      this.loadDevices(condo.condominium_id);
    });
    this.twilioService.incomingCall$.pipe(takeUntil(this.destroy$)).subscribe(call => {
      this.incomingCall = call;
      if (call != null) {
        const from = call.parameters['From'];
        this.incomingDevice = this.devices.find(device => device.sip_address?.includes(from));
      }
    });
  }

  loadDevices(condominiumId: string): void {
    this.loading = true;
    this.consjerjeriaService.getDevices(condominiumId).subscribe({
      next: devices => {
        const preparedDevices = devices.map(device => {
          const separator = device.stream_url.includes('?') ? '&' : '?';
          const streamUrl = `${device.stream_url}${separator}controls=false&autoplay=true&muted=true&playsInline=true&disablepictureinpicture=true`;
          return { ...device, safeStreamUrl: this.sanitizer.bypassSecurityTrustResourceUrl(streamUrl) };
        });
        this.devices = preparedDevices;
        this.cameraDevices = preparedDevices.filter(device => device.type === 'camera' || device.type === 'intercom');
        this.loading = false;
      },
      error: err => {
        console.error('Unable to load concierge devices:', err);
        this.loading = false;
      }
    });
  }

  openFullscreen(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const cameraPlayer = button.closest('.camera-player') as HTMLElement;
    if (!cameraPlayer) return;
    if (cameraPlayer.requestFullscreen) {
      cameraPlayer.requestFullscreen();
    }
  }

  getLastSeen(device: any): string {
    if (!device.last_seen_at) {
      return '--:--:--';
    }

    return new Date(device.last_seen_at)
      .toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  imageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/no-camera.jpg';
  }

  getStatus(device: any): string {
    return device.active ? 'ONLINE' : 'OFFLINE';
  }

  getStatusColor(device: any): string {
    return device.active ? '#2ECC71' : '#E74C3C';
  }

  simulateCall(): void {
    console.log('Simulate Call');
  }

  answerCall(): void {
    if (!this.incomingCall) {
      return;
    }
    const call = this.incomingCall;
    call.accept();
    this.activeCall = call;
    this.incomingCall = null;
    call.on('disconnect', () => {
      this.activeCall = null;
    });
    call.on('cancel', () => {
      this.activeCall = null;
      this.incomingCall = null;
    });
  }

  rejectCall(): void {
    if (!this.incomingCall) {
      return;
    }
    this.incomingCall.reject();
    this.incomingCall = null;
  }

  hangupCall(): void {
    if (!this.activeCall) {
      return;
    }
    this.activeCall.disconnect();
    this.activeCall = null;
  }

  openDoor(): void {
    console.log('Open Door');
  }

  registerVisit(): void {
    console.log('Register Visit');
  }

  callResident(): void {
    console.log('Call Resident');
  }

  emergency(): void {
    console.log('SOS');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}