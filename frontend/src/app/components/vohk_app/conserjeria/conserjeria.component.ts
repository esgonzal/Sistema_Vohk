import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SelectedCondominium, SelectedCondominiumService } from 'src/app/services/vohk_app/selected-condominium.service';
import { DomSanitizer } from '@angular/platform-browser';
import { TwilioService } from 'src/app/services/vohk_app/twilio.service';
import { Call } from '@twilio/voice-sdk';
import { ConserjeriaService } from 'src/app/services/vohk_app/conserjeria.service';
import { DashboardService } from 'src/app/services/vohk_app/dashboard.service';

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
  activities: any[] = [];
  activityPage = 0;
  activityPageSize = 5;
  activityPageSizeOptions = [5, 10, 20];

  private destroy$ = new Subject<void>();

  constructor(
    private consjerjeriaService: ConserjeriaService,
    private selectedCondominiumService: SelectedCondominiumService,
    private sanitizer: DomSanitizer,
    private twilioService: TwilioService,
    private dashboardService: DashboardService
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
      this.loadActivities(condo.condominium_id);
    });
    this.twilioService.incomingCall$.pipe(takeUntil(this.destroy$)).subscribe(call => {
      this.incomingCall = call;
      if (!call) {
        this.incomingDevice = null;
        return;
      }
      const callType = call.customParameters.get('call_type');
      const deviceId = call.customParameters.get('device_id');
      console.log('Incoming Twilio call:', {
        from: call.parameters['From'],
        callType,
        deviceId,
        customParameters: Object.fromEntries(call.customParameters.entries())
      });
      if (callType === 'intercom' && deviceId) {
        this.incomingDevice =
          this.devices.find(device => device.device_id?.toString() === deviceId) ?? null;
        if (!this.incomingDevice) {
          console.warn('Incoming intercom device not found in loaded devices:', deviceId);
        }
        return;
      }
      this.incomingDevice = null;
    });
  }

  loadDevices(condominiumId: string): void {
    this.loading = true;
    this.consjerjeriaService.getDevices(condominiumId).subscribe({
      next: data => {
        console.log('Consejeria:', data);
        const devices = (data.zones ?? []).flatMap((zone: any) => (zone.devices ?? []).map((device: any) => ({ ...device, zone_name: zone.name })));
        const preparedDevices = devices.map((device: any) => {
          const separator = device.stream_url.includes('?') ? '&' : '?';
          const streamUrl = `${device.stream_url}${separator}controls=false&autoplay=true&muted=true&playsInline=true&disablepictureinpicture=true`;
          return { ...device, safeStreamUrl: this.sanitizer.bypassSecurityTrustResourceUrl(streamUrl) };
        });
        this.devices = preparedDevices;
        this.cameraDevices = preparedDevices.filter((device: any) => device.type === 'camera' || device.type === 'intercom');
        this.loading = false;
      },
      error: err => {
        console.error('Unable to load concierge devices:', err);
        this.devices = [];
        this.cameraDevices = [];
        this.loading = false;
      }
    });
  }

  loadActivities(condominiumId: string): void {
    this.dashboardService.getActivities().subscribe({
      next: data => {
        this.activities = (data ?? []).filter(
          (activity: any) =>
            activity.condominium_id?.toString() === condominiumId.toString()
        );
        this.activityPage = 0;
      },
      error: err => {
        console.error('Unable to load concierge activities:', err);
        this.activities = [];
        this.activityPage = 0;
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
    if (!this.incomingCall) return;
    const call = this.incomingCall;
    call.accept();
    this.activeCall = call;
    this.incomingCall = null;
    this.twilioService.clearIncomingCall();
    call.on('disconnect', () => {
      this.activeCall = null;
      this.incomingDevice = null;
    });
    call.on('cancel', () => {
      this.activeCall = null;
      this.incomingCall = null;
      this.incomingDevice = null;
    });
  }

  rejectCall(): void {
    if (!this.incomingCall) return;
    this.incomingCall.reject();
    this.twilioService.clearIncomingCall();
    this.incomingCall = null;
    this.incomingDevice = null;
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

  get pagedActivities(): any[] {
    const start = this.activityPage * this.activityPageSize;
    return this.activities.slice(start, start + this.activityPageSize);
  }

  get activityTotalPages(): number {
    return Math.max(1, Math.ceil(this.activities.length / this.activityPageSize));
  }

  get activityStart(): number {
    if (!this.activities.length) return 0;
    return this.activityPage * this.activityPageSize + 1;
  }

  get activityEnd(): number {
    return Math.min(
      (this.activityPage + 1) * this.activityPageSize,
      this.activities.length
    );
  }

  previousActivityPage(): void {
    if (this.activityPage > 0) {
      this.activityPage--;
    }
  }

  nextActivityPage(): void {
    if (this.activityPage + 1 < this.activityTotalPages) {
      this.activityPage++;
    }
  }

  changeActivityPageSize(value: string): void {
    this.activityPageSize = Number(value);
    this.activityPage = 0;
  }

  activityTitle(activity: any): string {
    if (activity.event_type === 'door_open') {
      return `${activity.actor_name || 'Usuario'} abrió ${activity.device_name || 'un acceso'}`;
    }

    const participants = activity.participants ?? [];

    const caller =
      participants.find((item: any) => item.role === 'caller')?.name ||
      activity.actor_name;

    const recipient =
      participants.find((item: any) => item.role === 'recipient')?.name;

    if (caller && recipient) {
      return `${caller} llamó a ${recipient}`;
    }

    if (caller && activity.device_name) {
      return `${caller} llamó a ${activity.device_name}`;
    }

    if (recipient && activity.device_name) {
      return `${activity.device_name} llamó a ${recipient}`;
    }

    return 'Llamada registrada';
  }

  activityStatus(status: string): string {
    const labels: Record<string, string> = {
      initiated: 'Iniciada',
      ringing: 'Sonando',
      answered: 'Contestada',
      completed: 'Finalizada',
      'no-answer': 'Sin respuesta',
      busy: 'Ocupado',
      failed: 'Fallida',
      canceled: 'Cancelada',
      succeeded: 'Realizado'
    };

    return labels[status] || status;
  }
}