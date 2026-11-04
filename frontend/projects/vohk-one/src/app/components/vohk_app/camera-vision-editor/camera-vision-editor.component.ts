import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { CameraVisionProfileResponse, DeviceService, VisionPoint, VisionRegion, VisionRegionType, VisionRule } from '../../../services/vohk_app/device.service';

interface EditableRegion extends VisionRegion {
  ruleEnabled: boolean;
  ruleName: string;
  eventType: string;
  minimumSeconds: number;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
  scheduleDays: number[];
  saveSnapshot: boolean;
  storeEvent: boolean;
  requestAiAnalysis: boolean;
}

@Component({
  selector: 'app-camera-vision-editor',
  templateUrl: './camera-vision-editor.component.html',
  styleUrls: ['./camera-vision-editor.component.css'],
  styles: [`
    .purpose-help, .field-hint { display:block; color:#858995; font-size:12px; line-height:1.4; }
    .purpose-help { margin-top:6px; }
    .rule-toggle { font-weight:600; color:#f4f4f5 !important; }
    .rule-subsection { margin-top:12px; padding-top:12px; border-top:1px solid #292c33; }
    .time-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:9px; }
    .day-picker { display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; margin-top:10px; }
    .day-picker button { border:1px solid #343740; border-radius:7px; background:#17191e; color:#999; padding:7px 0; cursor:pointer; }
    .day-picker button.active { border-color:#2e6bff; background:rgba(46,107,255,.2); color:#fff; }
    .actions-grid { display:grid; gap:8px; }
    .actions-grid strong { margin-bottom:2px; }
  `],
})
export class CameraVisionEditorComponent implements OnInit, OnDestroy {
  @ViewChild('overlay') overlay?: ElementRef<SVGSVGElement>;
  readonly regionTypes: Array<{ value: VisionRegionType; label: string }> = [
    { value: 'occupancy', label: 'Área delimitada' },
    { value: 'transition', label: 'Cruce de umbral' },
  ];
  readonly weekDays = [
    { value: 1, label: 'L' }, { value: 2, label: 'M' }, { value: 3, label: 'M' },
    { value: 4, label: 'J' }, { value: 5, label: 'V' }, { value: 6, label: 'S' },
    { value: 7, label: 'D' },
  ];
  deviceId = ''; deviceName = ''; snapshotUrl: string | null = null; imageSource: string | null = null;
  imageWidth: number | null = null; imageHeight: number | null = null; localImageName = '';
  sceneContext = ''; calibrationVersion = 1; configurationVersion = 0; profileEnabled = true;
  regions: EditableRegion[] = []; selectedIndex = -1; drawing = false; drawingPoints: VisionPoint[] = [];
  loading = true; saving = false; error = '';
  private dragging: { regionIndex: number; pointIndex: number } | null = null;
  private objectUrl: string | null = null; private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private router: Router, private deviceService: DeviceService) {}
  ngOnInit(): void { this.deviceId = this.route.snapshot.paramMap.get('deviceId') || ''; this.deviceId ? this.load() : this.back(); }
  get selectedRegion(): EditableRegion | null { return this.selectedIndex >= 0 ? this.regions[this.selectedIndex] : null; }
  get aspectRatio(): string { return `${this.imageWidth || 16} / ${this.imageHeight || 9}`; }

  load(): void {
    this.loading = true; this.error = '';
    this.deviceService.getVisionProfile(this.deviceId).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => { this.applyResponse(response); this.loading = false; },
      error: err => { this.error = err.error?.error || 'No se pudo cargar el perfil de visión.'; this.loading = false; },
    });
  }
  private applyResponse(response: CameraVisionProfileResponse): void {
    this.deviceName = response.device.name; this.snapshotUrl = response.device.snapshotUrl; this.imageSource = this.snapshotUrl;
    this.sceneContext = response.profile.sceneContext; this.calibrationVersion = response.profile.calibrationVersion;
    this.configurationVersion = response.profile.configurationVersion; this.imageWidth = response.profile.referenceWidth;
    this.imageHeight = response.profile.referenceHeight; this.profileEnabled = response.profile.enabled;
    this.regions = response.regions.map(region => this.toEditableRegion(region, response.rules));
    this.selectedIndex = this.regions.length ? 0 : -1;
  }
  private toEditableRegion(region: VisionRegion, rules: VisionRule[]): EditableRegion {
    const rule = rules.find(item => item.conditions?.regionKey === region.key);
    const type: VisionRegionType = region.type === 'transition' ? 'transition' : 'occupancy';
    const actions = rule?.conditions?.actions;
    return {
      ...region,
      type,
      points: region.points.map(point => ({ ...point })),
      ruleEnabled: !!rule?.enabled,
      ruleName: rule?.name || this.defaultRuleName(type, region.name),
      eventType: rule?.eventType || this.defaultEventType(type),
      minimumSeconds: Number(rule?.conditions?.minimumSeconds || 5),
      scheduleEnabled: !!rule?.schedule?.enabled,
      scheduleStart: rule?.schedule?.startTime || '22:00',
      scheduleEnd: rule?.schedule?.endTime || '06:00',
      scheduleDays: rule?.schedule?.daysOfWeek?.length ? [...rule.schedule.daysOfWeek] : [1, 2, 3, 4, 5, 6, 7],
      saveSnapshot: actions?.saveSnapshot !== false,
      storeEvent: actions?.storeEvent !== false,
      requestAiAnalysis: actions?.requestAiAnalysis === true || rule?.conditions?.requiresReasoning === true,
    };
  }
  private defaultRuleName(type: VisionRegionType, name: string): string { return type === 'transition' ? `Cruce en ${name}` : `Presencia en ${name}`; }
  private defaultEventType(type: VisionRegionType): string { return type === 'transition' ? 'region_crossed' : 'restricted_area_presence'; }
  onImageLoaded(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!this.imageWidth || !this.imageHeight || this.localImageName) { this.imageWidth = image.naturalWidth; this.imageHeight = image.naturalHeight; }
  }
  chooseImage(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { Swal.fire('Archivo inválido', 'Selecciona una imagen JPEG, PNG o WebP.', 'warning'); input.value = ''; return; }
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(file); this.imageSource = this.objectUrl; this.localImageName = file.name;
  }
  useDeviceSnapshot(): void { if (this.snapshotUrl) { this.imageSource = this.snapshotUrl; this.localImageName = ''; } }
  startDrawing(): void { this.drawing = true; this.drawingPoints = []; this.selectedIndex = -1; }
  cancelDrawing(): void { this.drawing = false; this.drawingPoints = []; }
  undoPoint(): void { this.drawingPoints = this.drawingPoints.slice(0, -1); }
  finishDrawing(): void {
    if (this.drawingPoints.length < 3) return; const number = this.regions.length + 1;
    this.regions.push({
      key: this.uniqueKey(`region_${number}`), name: `Región ${number}`, type: 'occupancy',
      color: '#ef4444', points: this.drawingPoints.map(point => ({ ...point })), description: '', enabled: true,
      ruleEnabled: false, ruleName: `Presencia en Región ${number}`, eventType: 'restricted_area_presence',
      minimumSeconds: 5, scheduleEnabled: false, scheduleStart: '22:00', scheduleEnd: '06:00',
      scheduleDays: [1, 2, 3, 4, 5, 6, 7], saveSnapshot: true, storeEvent: true,
      requestAiAnalysis: false,
    });
    this.selectedIndex = this.regions.length - 1; this.cancelDrawing();
  }
  onOverlayClick(event: MouseEvent): void { if (this.drawing && event.button === 0) this.drawingPoints = [...this.drawingPoints, this.pointFromEvent(event)]; }
  selectRegion(index: number, event?: Event): void { event?.stopPropagation(); if (!this.drawing) this.selectedIndex = index; }
  startPointDrag(regionIndex: number, pointIndex: number, event: PointerEvent): void {
    if (this.drawing) return; event.stopPropagation(); this.selectedIndex = regionIndex; this.dragging = { regionIndex, pointIndex }; this.overlay?.nativeElement.setPointerCapture(event.pointerId);
  }
  dragPoint(event: PointerEvent): void {
    if (!this.dragging) return; this.regions[this.dragging.regionIndex].points[this.dragging.pointIndex] = this.pointFromEvent(event); this.regions = [...this.regions];
  }
  stopPointDrag(event: PointerEvent): void {
    if (!this.dragging) return; if (this.overlay?.nativeElement.hasPointerCapture(event.pointerId)) this.overlay.nativeElement.releasePointerCapture(event.pointerId); this.dragging = null;
  }
  private pointFromEvent(event: MouseEvent | PointerEvent): VisionPoint {
    const rect = this.overlay!.nativeElement.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }
  polygonPoints(points: VisionPoint[]): string { return points.map(point => `${point.x},${point.y}`).join(' '); }
  deleteSelected(): void { if (!this.selectedRegion) return; this.regions.splice(this.selectedIndex, 1); this.regions = [...this.regions]; this.selectedIndex = Math.min(this.selectedIndex, this.regions.length - 1); }
  normalizeSelectedKey(): void {
    if (!this.selectedRegion) return;
    const base = this.selectedRegion.key.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'region';
    this.selectedRegion.key = this.uniqueKey(base, this.selectedIndex);
  }
  private uniqueKey(base: string, ignoredIndex = -1): string { let candidate = base; let suffix = 2; while (this.regions.some((region, index) => index !== ignoredIndex && region.key === candidate)) candidate = `${base}_${suffix++}`; return candidate; }
  onRegionTypeChanged(region: EditableRegion): void {
    region.ruleName = this.defaultRuleName(region.type, region.name);
    region.eventType = this.defaultEventType(region.type);
  }
  toggleScheduleDay(region: EditableRegion, day: number): void {
    region.scheduleDays = region.scheduleDays.includes(day)
      ? region.scheduleDays.filter(value => value !== day)
      : [...region.scheduleDays, day].sort((a, b) => a - b);
  }
  save(): void {
    if (this.drawing) { Swal.fire('Polígono incompleto', 'Finaliza o cancela el dibujo antes de guardar.', 'warning'); return; }
    this.saving = true;
    this.deviceService.saveVisionProfile(this.deviceId, this.payload()).subscribe({
      next: response => { this.applyResponse(response); this.saving = false; Swal.fire('Configuración guardada', 'Las regiones visuales quedaron almacenadas.', 'success'); },
      error: err => { this.saving = false; Swal.fire(err.status === 409 ? 'Configuración desactualizada' : 'Error', err.status === 409 ? 'Otra sesión guardó cambios. Recarga antes de volver a editar.' : (err.error?.error || 'No se pudo guardar la configuración.'), err.status === 409 ? 'warning' : 'error'); },
    });
  }
  private buildRules(): VisionRule[] {
    return this.regions.filter(region => region.ruleEnabled).map(region => ({
      name: region.ruleName || this.defaultRuleName(region.type, region.name),
      eventType: region.eventType || this.defaultEventType(region.type),
      conditions: {
        type: region.type === 'transition' ? 'region_entry' : 'dwell',
        regionKey: region.key,
        ...(region.type === 'transition' ? {} : { minimumSeconds: Number(region.minimumSeconds) }),
        requiresReasoning: region.requestAiAnalysis,
        actions: {
          saveSnapshot: region.saveSnapshot,
          storeEvent: region.storeEvent,
          requestAiAnalysis: region.requestAiAnalysis,
        },
      },
      severity: 'information',
      schedule: region.scheduleEnabled ? {
        enabled: true, timezone: 'America/Santiago', startTime: region.scheduleStart,
        endTime: region.scheduleEnd, daysOfWeek: [...region.scheduleDays],
      } : null,
      enabled: true,
    }));
  }
  private payload(): any {
    const regions = this.regions.map(region => ({
      id: region.id, key: region.key, name: region.name, type: region.type, color: region.color,
      points: region.points, description: region.description, enabled: region.enabled,
    }));
    return { configurationVersion: this.configurationVersion, profile: { sceneContext: this.sceneContext, calibrationVersion: this.calibrationVersion, referenceWidth: this.imageWidth, referenceHeight: this.imageHeight, referenceImageKey: null, enabled: this.profileEnabled }, regions, rules: this.buildRules() };
  }
  exportJson(): void {
    const blob = new Blob([JSON.stringify({ deviceId: this.deviceId, ...this.payload() }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${this.deviceName || this.deviceId}-vision.json`.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase(); anchor.click(); URL.revokeObjectURL(url);
  }
  back(): void { this.router.navigate(['/admin/dispositivos']); }
  ngOnDestroy(): void { if (this.objectUrl) URL.revokeObjectURL(this.objectUrl); this.destroy$.next(); this.destroy$.complete(); }
}
