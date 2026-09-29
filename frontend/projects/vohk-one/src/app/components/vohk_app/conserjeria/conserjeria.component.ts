import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom, forkJoin, Subject, takeUntil, timer } from 'rxjs';
import { SelectedCondominium, SelectedCondominiumService } from 'src/app/services/vohk_app/selected-condominium.service';
import { DomSanitizer } from '@angular/platform-browser';
import { TwilioService } from 'src/app/services/vohk_app/twilio.service';
import { Call } from '@twilio/voice-sdk';
import { ConserjeriaService } from 'src/app/services/vohk_app/conserjeria.service';
import { DashboardService } from 'src/app/services/vohk_app/dashboard.service';
import { UserService } from 'src/app/services/vohk_app/user.service';

type ActionPanel = 'menu' | 'doors' | 'residents';

interface GridPreset {
  id: string;
  label: string;
  columns: number;
  rows: number;
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
  doorDevices: any[] = [];
  openingDoor = false;
  selectedDoorId = '';
  doorMessage = '';
  doorError = '';
  residents: any[] = [];
  residentSearch = '';
  loadingResidents = false;
  outgoingCall: Call | null = null;
  placingCall = false;
  outgoingResident: any = null;
  outgoingCallStatus = '';
  outgoingCallError = '';
  actionPanel: ActionPanel = 'menu';
  operationsExpanded = false;
  readonly gridPresets: GridPreset[] = [
    { id: '1x1', label: '1 × 1', columns: 1, rows: 1 },
    { id: '2x2', label: '2 × 2', columns: 2, rows: 2 },
    { id: '3x2', label: '3 × 2', columns: 3, rows: 2 },
    { id: '3x3', label: '3 × 3', columns: 3, rows: 3 },
    { id: '4x3', label: '4 × 3', columns: 4, rows: 3 }
  ];
  selectedGridPreset = '3x2';
  gridColumns = 3;
  gridRows = 2;
  selectedCondominium: SelectedCondominium | null = null;
  incomingCall: Call | null = null;
  activeCall: Call | null = null;
  incomingDevice: any = null;
  activities: any[] = [];
  accessActivities: any[] = [];
  activityPage = 0;
  activityPageSize = 5;
  activityPageSizeOptions = [5, 10, 20];
  activityFilter: 'all' | 'access' = 'all';

  private destroy$ = new Subject<void>();
  private draggedCameraId: string | null = null;

  constructor(
    private consjerjeriaService: ConserjeriaService,
    private selectedCondominiumService: SelectedCondominiumService,
    private sanitizer: DomSanitizer,
    private twilioService: TwilioService,
    private dashboardService: DashboardService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.selectedCondominiumService.selected$.pipe(takeUntil(this.destroy$)).subscribe(condo => {
      this.selectedCondominium = condo;
      if (!condo) {
        this.loading = false;
        this.devices = [];
        this.cameraDevices = [];
        this.doorDevices = [];
        this.residents = [];
        this.actionPanel = 'menu';
        this.activities = [];
        this.accessActivities = [];
        return;
      }
      this.loadDevices(condo.condominium_id);
      this.loadResidents(condo.condominium_id);
      this.loadActivities(condo.condominium_id);
    });
    timer(30_000, 30_000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.selectedCondominium) {
        this.loadActivities(this.selectedCondominium.condominium_id, false);
      }
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
          const rawStreamUrl = typeof device.stream_url === 'string' ? device.stream_url.trim() : '';
          if (!rawStreamUrl) {
            return { ...device, safeStreamUrl: null };
          }
          const separator = rawStreamUrl.includes('?') ? '&' : '?';
          const streamUrl = `${rawStreamUrl}${separator}controls=false&autoplay=true&muted=true&playsInline=true&disablepictureinpicture=true`;
          return { ...device, safeStreamUrl: this.sanitizer.bypassSecurityTrustResourceUrl(streamUrl) };
        });
        this.devices = preparedDevices;
        this.cameraDevices = preparedDevices.filter((device: any) => device.type === 'camera' || device.type === 'intercom');
        this.restoreCameraLayout(condominiumId);
        this.doorDevices = preparedDevices.filter((device: any) => ['intercom', 'lock', 'gate'].includes(device.type));
        if (!this.doorDevices.some(device => device.device_id === this.selectedDoorId)) {
          this.selectedDoorId = this.doorDevices[0]?.device_id || '';
        }
        this.loading = false;
      },
      error: err => {
        console.error('Unable to load concierge devices:', err);
        this.devices = [];
        this.cameraDevices = [];
        this.doorDevices = [];
        this.loading = false;
      }
    });
  }

  loadResidents(condominiumId: string): void {
    this.loadingResidents = true;
    this.userService.getUsers(condominiumId).pipe(takeUntil(this.destroy$)).subscribe({
      next: users => {
        this.residents = (users ?? []).filter(user => user.role === 'resident' && user.active === true && user.sip_identity);
        this.loadingResidents = false;
      },
      error: error => {
        console.error('Unable to load concierge residents:', error);
        this.residents = [];
        this.loadingResidents = false;
      }
    });
  }

  private layoutStorageKey(condominiumId: string): string {
    const userId = localStorage.getItem('userId') || 'anonymous';
    return `vohk:concierge-layout:${userId}:${condominiumId}`;
  }

  private restoreCameraLayout(condominiumId: string): void {
    try {
      const stored = JSON.parse(localStorage.getItem(this.layoutStorageKey(condominiumId)) || '{}');
      const preset = this.gridPresets.find(item => item.id === stored.preset);
      if (preset) {
        this.selectedGridPreset = preset.id;
        this.gridColumns = preset.columns;
        this.gridRows = preset.rows;
      }
      if (Array.isArray(stored.order)) {
        const positions = new Map(stored.order.map((id: string, index: number) => [id, index]));
        this.cameraDevices.sort((left, right) => {
          const leftPosition = positions.has(left.device_id) ? Number(positions.get(left.device_id)) : Number.MAX_SAFE_INTEGER;
          const rightPosition = positions.has(right.device_id) ? Number(positions.get(right.device_id)) : Number.MAX_SAFE_INTEGER;
          return leftPosition - rightPosition;
        });
      }
    } catch (error) {
      console.warn('Could not restore camera layout:', error);
    }
  }

  private saveCameraLayout(): void {
    if (!this.selectedCondominium) return;
    localStorage.setItem(this.layoutStorageKey(this.selectedCondominium.condominium_id), JSON.stringify({
      preset: this.selectedGridPreset,
      order: this.cameraDevices.map(device => device.device_id)
    }));
  }

  setGridPreset(preset: GridPreset): void {
    this.selectedGridPreset = preset.id;
    this.gridColumns = preset.columns;
    this.gridRows = preset.rows;
    this.saveCameraLayout();
  }

  cameraTrackBy(_: number, device: any): string {
    return device.device_id;
  }

  onCameraDragStart(event: DragEvent, device: any): void {
    this.draggedCameraId = device.device_id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', device.device_id);
    }
  }

  onCameraDrop(event: DragEvent, target: any): void {
    event.preventDefault();
    const sourceId = this.draggedCameraId || event.dataTransfer?.getData('text/plain');
    if (!sourceId || sourceId === target.device_id) return;
    const sourceIndex = this.cameraDevices.findIndex(device => device.device_id === sourceId);
    const targetIndex = this.cameraDevices.findIndex(device => device.device_id === target.device_id);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const reordered = [...this.cameraDevices];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    this.cameraDevices = reordered;
    this.draggedCameraId = null;
    this.saveCameraLayout();
  }

  onCameraDragEnd(): void {
    this.draggedCameraId = null;
  }

  loadActivities(condominiumId: string, resetPage = true): void {
    forkJoin({
      all: this.dashboardService.getActivities(100, condominiumId),
      access: this.dashboardService.getActivities(100, condominiumId, 'access')
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.activities = data.all ?? [];
        this.accessActivities = data.access ?? [];
        if (resetPage) this.activityPage = 0;
      },
      error: err => {
        console.error('Unable to load concierge activities:', err);
        this.activities = [];
        this.accessActivities = [];
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
    return device.active === true && device.online === true ? 'ONLINE' : 'OFFLINE';
  }

  getStatusColor(device: any): string {
    return device.active === true && device.online === true ? '#2ECC71' : '#E74C3C';
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

  showActionPanel(panel: ActionPanel): void {
    this.operationsExpanded = true;
    this.actionPanel = panel;
    this.doorMessage = '';
    this.doorError = '';
    this.outgoingCallError = '';
    if (panel === 'doors' && !this.selectedDoorId) {
      this.selectedDoorId = this.doorDevices[0]?.device_id || '';
    }
  }

  toggleOperations(): void {
    this.operationsExpanded = !this.operationsExpanded;
  }

  async openSelectedDoor(): Promise<void> {
    if (this.openingDoor || !this.selectedDoorId) return;
    const device = this.doorDevices.find(item => item.device_id === this.selectedDoorId);
    if (!device) return;
    this.openingDoor = true;
    this.doorMessage = '';
    this.doorError = '';
    try {
      await firstValueFrom(this.consjerjeriaService.openDoor(device.device_id));
      this.doorMessage = `${device.name} recibió la orden de apertura.`;
      if (this.selectedCondominium) {
        this.loadActivities(this.selectedCondominium.condominium_id);
      }
    } catch (error: any) {
      this.doorError = error?.error?.error || 'No se pudo abrir la puerta.';
    } finally {
      this.openingDoor = false;
    }
  }

  get filteredResidents(): any[] {
    const query = this.residentSearch.trim().toLowerCase();
    if (!query) return this.residents;
    return this.residents.filter(resident => {
      const locations = (resident.locations ?? [])
        .map((location: any) => `${location.building || ''} ${location.unit || ''} ${location.roomNo || ''}`)
        .join(' ');
      return `${resident.legal_name || ''} ${resident.email || ''} ${resident.rut || ''} ${locations}`
        .toLowerCase()
        .includes(query);
    });
  }

  residentLocation(resident: any): string {
    const locations = (resident.locations ?? []).map((location: any) => {
      const unit = location.unit || location.roomNo || 'Unidad';
      return location.building ? `${location.building} · ${unit}` : unit;
    });
    return locations.join(', ') || 'Sin unidad';
  }

  async callResident(resident: any): Promise<void> {
    if (!resident?.sip_identity || this.outgoingCall || this.placingCall) return;
    this.placingCall = true;
    this.outgoingCallError = '';
    this.outgoingResident = resident;
    this.outgoingCallStatus = 'Conectando…';
    try {
      const call = await this.twilioService.call(resident.sip_identity);
      this.outgoingCall = call;
      this.placingCall = false;
      this.outgoingCallStatus = 'Llamando…';
      call.on('ringing', () => this.outgoingCallStatus = 'Sonando…');
      call.on('accept', () => this.outgoingCallStatus = 'En llamada');
      const finish = () => {
        if (this.outgoingCall === call) {
          this.outgoingCall = null;
          this.outgoingCallStatus = 'Llamada finalizada';
        }
      };
      call.on('disconnect', finish);
      call.on('cancel', finish);
      call.on('error', (error: any) => {
        this.outgoingCallError = error?.message || 'La llamada terminó con un error.';
        finish();
      });
    } catch (error: any) {
      console.error('Unable to start resident call:', error);
      this.outgoingCall = null;
      this.placingCall = false;
      this.outgoingCallStatus = '';
      this.outgoingCallError = error?.message || 'No se pudo iniciar la llamada.';
    }
  }

  endOutgoingCall(): void {
    this.twilioService.disconnectCall();
    this.outgoingCall = null;
    this.outgoingCallStatus = 'Llamada finalizada';
  }

  ngOnDestroy(): void {
    if (this.outgoingCall) {
      this.twilioService.disconnectCall();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pagedActivities(): any[] {
    const start = this.activityPage * this.activityPageSize;
    return this.visibleActivities.slice(start, start + this.activityPageSize);
  }

  get visibleActivities(): any[] {
    return this.activityFilter === 'access'
      ? this.accessActivities
      : this.activities;
  }

  get activityTotalPages(): number {
    return Math.max(1, Math.ceil(this.visibleActivities.length / this.activityPageSize));
  }

  get activityStart(): number {
    if (!this.visibleActivities.length) return 0;
    return this.activityPage * this.activityPageSize + 1;
  }

  get activityEnd(): number {
    return Math.min(
      (this.activityPage + 1) * this.activityPageSize,
      this.visibleActivities.length
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

  setActivityFilter(filter: 'all' | 'access'): void {
    this.activityFilter = filter;
    this.activityPage = 0;
  }

  activityTitle(activity: any): string {
    if (activity.event_type === 'access') {
      const subject = activity.actor_name || activity.metadata?.subjectName || 'Persona no identificada';
      const description = activity.metadata?.description;
      return description ? `${subject}: ${description}` : `${subject} registró un intento de acceso`;
    }
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

  activityMethod(activity: any): string {
    if (activity.event_type === 'door_open') return 'Remoto';
    if (activity.event_type !== 'access') return '—';
    return activity.metadata?.methodLabel || 'Desconocido';
  }

  activityStatus(activity: any): string {
    const status = activity.status;
    if (activity.event_type === 'access') {
      if (status === 'succeeded') return 'Permitido';
      if (status === 'failed') return 'Rechazado';
      if (status === 'recorded') return 'Registrado';
    }
    const labels: Record<string, string> = {
      initiated: 'Iniciada',
      ringing: 'Sonando',
      answered: 'Contestada',
      completed: 'Finalizada',
      'no-answer': 'Sin respuesta',
      busy: 'Ocupado',
      failed: 'Fallida',
      canceled: 'Cancelada',
      succeeded: 'Realizado',
      recorded: 'Registrado'
    };

    return labels[status] || status;
  }
}
