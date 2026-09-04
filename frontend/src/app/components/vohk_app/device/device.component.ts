import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom, forkJoin, Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AvailableTtlockDevice, DeviceService } from 'src/app/services/vohk_app/device.service';
import { SelectedCondominium, SelectedCondominiumService } from 'src/app/services/vohk_app/selected-condominium.service';

@Component({
  selector: 'app-device',
  templateUrl: './device.component.html',
  styleUrls: ['./device.component.css']
})
export class DeviceComponent implements OnInit, OnDestroy {

  devices: any[] = [];
  filteredDevices: any[] = [];
  zones: any[] = [];

  selectedCondominium: SelectedCondominium | null = null;

  loading = true;
  searchText = '';
  selectedType = 'Todos';

  private destroy$ = new Subject<void>();

  get isSuperAdmin(): boolean {
    return localStorage.getItem('role') === 'superadmin';
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  constructor(
    private deviceService: DeviceService,
    private selectedCondominiumService: SelectedCondominiumService
  ) { }

  ngOnInit(): void {
    this.selectedCondominiumService.selected$.pipe(takeUntil(this.destroy$)).subscribe(condo => {
      this.selectedCondominium = condo;
      this.searchText = '';
      this.selectedType = 'Todos';

      if (!condo) {
        this.devices = [];
        this.filteredDevices = [];
        this.zones = [];
        this.loading = false;
        return;
      }

      this.loadDevices(condo.condominium_id);
    });
  }

  loadDevices(condominiumId: string): void {
    this.loading = true;

    this.deviceService.getDeviceTree(condominiumId).subscribe({
      next: data => {
        console.log('DEVICES TREE:', data);
        this.zones = data.zones ?? [];

        this.devices = this.zones.flatMap((zone: any) =>
          (zone.devices ?? []).map((device: any) => ({
            ...device,
            zone_name: zone.name
          }))
        );

        this.filteredDevices = [...this.devices];
        this.loading = false;
      },
      error: err => {
        console.error('Error loading devices:', err);
        this.devices = [];
        this.filteredDevices = [];
        this.zones = [];
        this.loading = false;
      }
    });
  }

  reloadDevices(): void {
    if (!this.selectedCondominium) {
      return;
    }

    this.loadDevices(this.selectedCondominium.condominium_id);
  }

  onSearch(event: any): void {
    this.searchText = event.target.value.toLowerCase();
    this.applyFilters();
  }

  filterByType(type: string): void {
    this.selectedType = type;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredDevices = this.devices.filter(device => {
      const matchesType = this.selectedType === 'Todos' || device.type === this.selectedType;

      const text = `
        ${device.name ?? ''}
        ${device.ip_address ?? ''}
        ${device.ttlock_external_lock_id ?? ''}
        ${device.ttlock_lock_alias ?? ''}
        ${device.ttlock_lock_mac ?? ''}
        ${device.zone_name ?? ''}
      `.toLowerCase();

      return matchesType && text.includes(this.searchText);
    });
  }

  getTotalCount(): number {
    return this.devices.length;
  }

  getCameraCount(): number {
    return this.devices.filter(device => device.type === 'camera').length;
  }

  supportsIdentityRefresh(device: any): boolean {
    return String(device?.vendor || '').toLowerCase() === 'hikvision';
  }

  getIntercomCount(): number {
    return this.devices.filter(device => device.type === 'intercom').length;
  }

  getTtlockCount(): number {
    return this.devices.filter(device => device.type === 'lock' || device.type === 'gate').length;
  }

  getInactiveCount(): number {
    return this.devices.filter(device => device.active !== true).length;
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'camera':
        return 'Cámara';
      case 'intercom':
        return 'Videoportero';
      case 'lock':
        return 'Cerradura';
      case 'gate':
        return 'Portón';
      default:
        return type || '-';
    }
  }

  getDeviceIcon(type: string): string {
    switch (type) {
      case 'intercom':
        return 'doorbell';
      case 'lock':
        return 'lock';
      case 'gate':
        return 'garage';
      default:
        return 'videocam';
    }
  }

  isTtlockDevice(device: any): boolean {
    return device?.type === 'lock' || device?.type === 'gate';
  }

  async openCreateDevice(): Promise<void> {
    if (!this.selectedCondominium) {
      Swal.fire('Sin condominio', 'Selecciona un condominio antes de crear un dispositivo.', 'warning');
      return;
    }

    if (!this.zones.length) {
      Swal.fire('Sin zonas', 'El condominio seleccionado no tiene zonas disponibles.', 'warning');
      return;
    }

    const zoneOptions = this.zones.map(zone => `<option value="${this.escapeHtml(zone.zone_id)}">${this.escapeHtml(zone.name)}</option>`).join('');
    let availableTtlockDevices: AvailableTtlockDevice[] = [];
    let ttlockLoadError = '';
    try {
      availableTtlockDevices = await firstValueFrom(this.deviceService.getAvailableTtlockDevices());
    } catch (error: any) {
      console.error('Error loading available TTLock devices:', error);
      ttlockLoadError = error?.error?.error || 'No se pudo consultar la cuenta maestra de TTLock.';
    }
    const ttlockOptions = availableTtlockDevices.map(lock => {
      const label = lock.lockAlias || lock.lockName || `TTLock ${lock.lockId}`;
      const category = lock.suggestedDeviceType === 'gate' ? 'Portón' : 'Cerradura';
      const connection = lock.hasGateway && lock.remoteEnabled ? 'Remoto habilitado' : 'Revisar gateway';
      return `<option value="${this.escapeHtml(lock.lockId)}">${this.escapeHtml(label)} · ${this.escapeHtml(lock.lockId)} · ${category} · ${connection}</option>`;
    }).join('');

    const result = await Swal.fire({
      title: 'Nuevo dispositivo',
      customClass: {
        popup: 'device-form-popup',
        htmlContainer: 'device-form-container'
      },
      html: `
        <select id="zoneId" class="swal2-select">
          <option value="">Seleccionar zona</option>
          ${zoneOptions}
        </select>

        <select id="type" class="swal2-select">
          <option value="camera">Cámara</option>
          <option value="intercom">Videoportero</option>
          <option value="lock">Cerradura TTLock</option>
          <option value="gate">Portón TTLock</option>
        </select>

        <input id="name" class="swal2-input" placeholder="Nombre">

        <div id="networkFields">
          <select id="vendor" class="swal2-select">
            <option value="hikvision">Hikvision</option>
            <option value="dahua">Dahua</option>
          </select>
          <input id="ipAddress" class="swal2-input" placeholder="Dirección IP">
          <input id="port" type="number" class="swal2-input" value="80" placeholder="Puerto">
          <input id="username" class="swal2-input" placeholder="Usuario">
          <input id="password" type="password" class="swal2-input" placeholder="Contraseña">
          <input id="snapshotUrl" class="swal2-input" placeholder="Snapshot URL">
          <input id="streamUrl" class="swal2-input" placeholder="Stream URL">
        </div>

        <div id="ttlockFields" style="display:none">
          <label for="ttlockLockId" class="swal2-input-label">Dispositivo de la cuenta maestra TTLock</label>
          <select id="ttlockLockId" class="swal2-select">
            <option value="">Seleccionar dispositivo</option>
            ${ttlockOptions}
          </select>
          ${ttlockLoadError ? `<div class="ttlock-form-error">${this.escapeHtml(ttlockLoadError)}</div>` : ''}
          ${!ttlockLoadError && availableTtlockDevices.length === 0 ? '<div class="ttlock-form-note">No hay dispositivos TTLock disponibles sin asociar.</div>' : ''}
        </div>

        <div id="intercomFields">
          <input id="sipAddress" class="swal2-input" placeholder="SIP address">
          <input id="doorId" type="number" class="swal2-input" value="1" placeholder="Door ID">
          <input id="periodNumber" type="number" min="1" max="9" class="swal2-input" value="1" placeholder="Periodo de llamada">
          <input id="buildingNumber" type="number" min="1" max="999" class="swal2-input" value="1" placeholder="Edificio de llamada">
          <input id="unitNumber" type="number" min="1" max="99" class="swal2-input" value="1" placeholder="Unidad de llamada">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,

      didOpen: () => {
        const type = document.getElementById('type') as HTMLSelectElement;
        const intercomFields = document.getElementById('intercomFields') as HTMLElement;
        const networkFields = document.getElementById('networkFields') as HTMLElement;
        const ttlockFields = document.getElementById('ttlockFields') as HTMLElement;
        const ttlockLockId = document.getElementById('ttlockLockId') as HTMLSelectElement;
        const name = document.getElementById('name') as HTMLInputElement;

        const updateFields = () => {
          const isTtlock = type.value === 'lock' || type.value === 'gate';
          intercomFields.style.display = type.value === 'intercom' ? 'block' : 'none';
          networkFields.style.display = isTtlock ? 'none' : 'block';
          ttlockFields.style.display = isTtlock ? 'block' : 'none';
        };

        type.addEventListener('change', updateFields);
        ttlockLockId.addEventListener('change', () => {
          const lock = availableTtlockDevices.find(item => String(item.lockId) === ttlockLockId.value);
          if (lock && !name.value.trim()) name.value = lock.lockAlias || lock.lockName || `TTLock ${lock.lockId}`;
        });
        updateFields();
      },

      preConfirm: () => {
        const zoneId = (document.getElementById('zoneId') as HTMLSelectElement).value;
        const type = (document.getElementById('type') as HTMLSelectElement).value;
        const isTtlock = type === 'lock' || type === 'gate';
        const vendor = (document.getElementById('vendor') as HTMLSelectElement).value;
        const name = (document.getElementById('name') as HTMLInputElement).value.trim();
        const ipAddress = (document.getElementById('ipAddress') as HTMLInputElement).value.trim();
        const port = Number((document.getElementById('port') as HTMLInputElement).value);
        const username = (document.getElementById('username') as HTMLInputElement).value.trim();
        const passwordEncrypted = (document.getElementById('password') as HTMLInputElement).value;
        const snapshotUrl = (document.getElementById('snapshotUrl') as HTMLInputElement).value.trim();
        const streamUrl = (document.getElementById('streamUrl') as HTMLInputElement).value.trim();
        const sipAddress = (document.getElementById('sipAddress') as HTMLInputElement).value.trim();
        const doorId = Number((document.getElementById('doorId') as HTMLInputElement).value);
        const periodNumber = Number((document.getElementById('periodNumber') as HTMLInputElement).value);
        const buildingNumber = Number((document.getElementById('buildingNumber') as HTMLInputElement).value);
        const unitNumber = Number((document.getElementById('unitNumber') as HTMLInputElement).value);
        const ttlockLockId = (document.getElementById('ttlockLockId') as HTMLSelectElement).value;

        if (!zoneId || !type || !name) {
          Swal.showValidationMessage('Zona, tipo y nombre son obligatorios');
          return;
        }

        if (isTtlock && !ttlockLockId) {
          Swal.showValidationMessage('Selecciona un dispositivo de la cuenta maestra TTLock');
          return;
        }

        if (!isTtlock && (!vendor || !ipAddress || !port || !username || !passwordEncrypted)) {
          Swal.showValidationMessage('Zona, tipo, fabricante, nombre, IP, puerto, usuario y contraseña son obligatorios');
          return;
        }

        if (type === 'intercom' && !sipAddress) {
          Swal.showValidationMessage('El SIP address es obligatorio para un videoportero');
          return;
        }

        if (type === 'intercom' && (
          !Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > 9 ||
          !Number.isInteger(buildingNumber) || buildingNumber < 1 || buildingNumber > 999 ||
          !Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 99
        )) {
          Swal.showValidationMessage('La jerarquia de llamada del videoportero no es valida');
          return;
        }

        return {
          deviceData: {
            zoneId,
            type,
            vendor: isTtlock ? 'ttlock' : vendor,
            name,
            ipAddress: isTtlock ? null : ipAddress,
            port: isTtlock ? null : port,
            username: isTtlock ? null : username,
            passwordEncrypted: isTtlock ? null : passwordEncrypted,
            snapshotUrl: isTtlock ? null : snapshotUrl || null,
            streamUrl: isTtlock ? null : streamUrl || null,
            active: true
          },
          intercomData: type === 'intercom' ? {
            sipAddress,
            doorId,
            periodNumber,
            buildingNumber,
            unitNumber
          } : null,
          ttlockData: isTtlock ? { lockId: Number(ttlockLockId) } : null
        };
      }
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    this.deviceService.createDevice(result.value.deviceData, result.value.intercomData, result.value.ttlockData).subscribe({
      next: () => {
        Swal.fire('Dispositivo creado', 'El dispositivo fue registrado correctamente.', 'success');
        this.reloadDevices();
      },
      error: err => {
        console.error('Error creating device:', err);
        Swal.fire('Error', err.error?.error || 'No se pudo crear el dispositivo.', 'error');
      }
    });
  }

  refreshIdentity(device: any): void {
    this.deviceService.refreshIdentity(device.device_id).subscribe({
      next: () => {
        Swal.fire('Identidad actualizada', 'Se detectaron el modelo y firmware mediante ISAPI.', 'success');
        this.reloadDevices();
      },
      error: err => Swal.fire('Error', err.error?.error || 'No se pudo detectar la identidad.', 'error')
    });
  }

  refreshTtlock(device: any): void {
    this.deviceService.refreshTtlock(device.device_id).subscribe({
      next: () => {
        Swal.fire('TTLock actualizado', 'Se actualizaron el gateway y los permisos remotos.', 'success');
        this.reloadDevices();
      },
      error: err => Swal.fire('Error', err.error?.error || 'No se pudo actualizar el dispositivo TTLock.', 'error')
    });
  }

  async provisionResidents(device: any): Promise<void> {
    const confirmation = await Swal.fire({
      title: 'Provisionar residentes',
      text: this.isTtlockDevice(device)
        ? `Se copiarán a ${device.name} los códigos dinámicos existentes de los residentes.`
        : `Se sincronizarán los residentes y números SIP existentes con ${device.name}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Provisionar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmation.isConfirmed) return;
    this.deviceService.provisionResidents(device.device_id).subscribe({
      next: result => Swal.fire(
        result.ok ? 'Provision completada' : 'Provision parcial',
        `${result.succeeded} residentes sincronizados; ${result.failures?.length || 0} fallas.`,
        result.ok ? 'success' : 'warning'
      ),
      error: err => Swal.fire('Error', err.error?.error || 'No se pudieron provisionar los residentes.', 'error')
    });
  }

  async editDevice(device: any): Promise<void> {
    const currentZone = this.zones.find(zone =>
      (zone.devices ?? []).some((candidate: any) => candidate.device_id === device.device_id)
    );
    const zoneOptions = this.zones.map(zone =>
      `<option value="${this.escapeHtml(zone.zone_id)}" ${zone.zone_id === currentZone?.zone_id ? 'selected' : ''}>${this.escapeHtml(zone.name)}</option>`
    ).join('');
    const result = await Swal.fire({
      title: 'Editar dispositivo',
      html: `
        <label for="editDeviceName" class="swal2-input-label">Nombre</label>
        <input id="editDeviceName" class="swal2-input" value="${this.escapeHtml(device.name)}">
        <label for="editDeviceZone" class="swal2-input-label">Zona</label>
        <select id="editDeviceZone" class="swal2-select">${zoneOptions}</select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById('editDeviceName') as HTMLInputElement).value.trim();
        const zoneId = (document.getElementById('editDeviceZone') as HTMLSelectElement).value;
        if (!name || !zoneId) {
          Swal.showValidationMessage('El nombre y la zona son obligatorios');
          return;
        }
        return { name, zoneId };
      }
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    const updates = [];
    if (result.value.name !== device.name) {
      updates.push(this.deviceService.updateDeviceName(device.device_id, result.value.name));
    }
    if (result.value.zoneId !== currentZone?.zone_id) {
      updates.push(this.deviceService.updateDeviceZone(device.device_id, result.value.zoneId));
    }
    if (!updates.length) {
      return;
    }

    forkJoin(updates).subscribe({
      next: () => {
        Swal.fire('Actualizado', 'El dispositivo fue actualizado.', 'success');
        this.reloadDevices();
      },
      error: err => {
        console.error('Error updating device:', err);
        Swal.fire('Error', err.error?.error || 'No se pudo actualizar el dispositivo.', 'error');
      }
    });
  }

  async deleteDevice(device: any): Promise<void> {
    const confirmation = await Swal.fire({
      title: '¿Eliminar dispositivo?',
      text: `${device.name} será eliminado del sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    this.deviceService.deleteDevice(device.device_id).subscribe({
      next: () => {
        Swal.fire('Eliminado', 'El dispositivo fue eliminado.', 'success');
        this.reloadDevices();
      },
      error: err => {
        console.error('Error deleting device:', err);
        Swal.fire('Error', err.error?.error || 'No se pudo eliminar el dispositivo.', 'error');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
