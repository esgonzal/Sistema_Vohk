import { Component, OnInit } from '@angular/core';
import { CondominiumService } from 'src/app/services/vohk_app/condominium.service';
import Swal from 'sweetalert2';

interface Condominium {
  condominium_id: string;
  name: string;
  address: string;
  city: string;
  resident_camera_access: boolean;
  max_recurrent_invitations: number;
  max_temporary_duration_hours: number;
  max_express_duration_hours: number;
  buildings: Building[];
  zones: Zone[];
  expanded?: boolean;
  cameraAccessSaving?: boolean;
  staff?: StaffMember[];
  shifts?: StaffShift[];
  shiftsLoaded?: boolean;
  shiftsLoading?: boolean;
}
interface StaffMember {
  user_id: string;
  legal_name: string;
  email?: string;
  active: boolean;
}
interface StaffShift {
  shift_id: string;
  condominium_id: string;
  name: string;
  start_time: string;
  end_time: string;
  weekdays: number[];
  enabled: boolean;
  staff: StaffMember[];
  saving?: boolean;
}
interface Building {
  building_id: string;
  name: string;
  floor_count: number;
  expanded?: boolean;
}
interface Zone {
  zone_id: string;
  name: string;
  created_at: string;
}

@Component({
  selector: 'app-condominiums',
  templateUrl: './condominiums.component.html',
  styleUrls: ['./condominiums.component.css']
})
export class CondominiumsComponent implements OnInit {

  data: any;
  condominiums: Condominium[] = [];
  loading = true;
  readonly dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  constructor(private condominiumService: CondominiumService) { }

  ngOnInit(): void {
    this.loadCondominiums();
  }
  loadCondominiums() {
    this.loading = true;
    this.condominiumService.getCondominiums().subscribe({
      next: data => {
        this.data = data;
        this.condominiums = data.map((condo: Condominium) => ({
          ...condo,
          expanded: false,
          buildings: condo.buildings?.map(building => ({ ...building, expanded: false })) || [],
          zones: condo.zones || []
        }));
        console.log('Condominios loaded:', this.condominiums);
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.loading = false;
      }
    });
  }
  toggleCondominium(condo: Condominium) {
    condo.expanded = !condo.expanded;
    if (condo.expanded && !condo.shiftsLoaded) this.loadStaffShifts(condo);
  }
  loadStaffShifts(condo: Condominium) {
    condo.shiftsLoading = true;
    this.condominiumService.getStaffShifts(condo.condominium_id).subscribe({
      next: data => {
        condo.staff = data.staff || [];
        condo.shifts = data.shifts || [];
        condo.shiftsLoaded = true;
        condo.shiftsLoading = false;
      },
      error: err => {
        condo.shiftsLoading = false;
        Swal.fire('Error', err.error?.error || 'No se pudieron cargar los turnos.', 'error');
      }
    });
  }
  formatShiftDays(days: number[]) {
    if (days.length === 7) return 'Todos los días';
    if (days.length === 5 && [1, 2, 3, 4, 5].every(day => days.includes(day))) return 'Lunes a viernes';
    return days.map(day => this.dayLabels[day]).join(', ');
  }
  private escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character] || character));
  }
  async openShiftEditor(condo: Condominium, shift?: StaffShift) {
    if (!condo.shiftsLoaded) return;
    const selectedDays = new Set(shift?.weekdays || [1, 2, 3, 4, 5]);
    const selectedStaff = new Set((shift?.staff || []).map(member => member.user_id));
    const daysHtml = this.dayLabels.map((label, index) => `
      <label class="shift-choice">
        <input type="checkbox" name="shift-day" value="${index}" ${selectedDays.has(index) ? 'checked' : ''}>
        <span>${label}</span>
      </label>`).join('');
    const staffHtml = (condo.staff || []).map(member => `
      <label class="shift-staff-choice ${member.active ? '' : 'inactive'}">
        <input type="checkbox" name="shift-staff" value="${member.user_id}"
          ${selectedStaff.has(member.user_id) ? 'checked' : ''} ${member.active ? '' : 'disabled'}>
        <span><strong>${this.escapeHtml(member.legal_name)}</strong>${member.email ? `<small>${this.escapeHtml(member.email)}</small>` : ''}</span>
      </label>`).join('');
    const result = await Swal.fire({
      title: shift ? 'Editar turno' : 'Nuevo turno',
      width: 650,
      html: `
        <div class="shift-form">
          <label>Nombre del turno<input id="shift-name" class="swal2-input" maxlength="100" value="${this.escapeHtml(shift?.name || '')}" placeholder="Ej. Turno mañana"></label>
          <div class="shift-time-grid">
            <label>Inicio<input id="shift-start" type="time" class="swal2-input" value="${shift?.start_time || '08:00'}"></label>
            <label>Término<input id="shift-end" type="time" class="swal2-input" value="${shift?.end_time || '16:00'}"></label>
          </div>
          <div><span class="shift-form-label">Días</span><div class="shift-days">${daysHtml}</div></div>
          <div><span class="shift-form-label">Personal asignado</span><div class="shift-staff-list">${staffHtml || '<p class="shift-empty">No hay cuentas de personal asignadas a este condominio.</p>'}</div></div>
          <label class="shift-enabled"><input id="shift-enabled" type="checkbox" ${shift?.enabled !== false ? 'checked' : ''}> Turno habilitado</label>
        </div>`,
      showCancelButton: true,
      confirmButtonText: shift ? 'Guardar cambios' : 'Crear turno',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const name = (document.getElementById('shift-name') as HTMLInputElement).value.trim();
        const startTime = (document.getElementById('shift-start') as HTMLInputElement).value;
        const endTime = (document.getElementById('shift-end') as HTMLInputElement).value;
        const weekdays = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="shift-day"]:checked')).map(input => Number(input.value));
        const staffUserIds = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="shift-staff"]:checked')).map(input => input.value);
        const enabled = (document.getElementById('shift-enabled') as HTMLInputElement).checked;
        if (!name || !startTime || !endTime) {
          Swal.showValidationMessage('Completa el nombre y las horas del turno.');
          return;
        }
        if (!weekdays.length) {
          Swal.showValidationMessage('Selecciona al menos un día.');
          return;
        }
        if (!staffUserIds.length) {
          Swal.showValidationMessage('Asigna al menos una cuenta de personal.');
          return;
        }
        return { name, startTime, endTime, weekdays, enabled, staffUserIds };
      }
    });
    if (!result.isConfirmed) return;
    const request = shift
      ? this.condominiumService.updateStaffShift(shift.shift_id, result.value)
      : this.condominiumService.createStaffShift(condo.condominium_id, result.value);
    request.subscribe({
      next: () => {
        this.loadStaffShifts(condo);
        Swal.fire('Guardado', 'El turno quedó guardado correctamente.', 'success');
      },
      error: err => Swal.fire('Error', err.error?.error || 'No se pudo guardar el turno.', 'error')
    });
  }
  toggleShift(condo: Condominium, shift: StaffShift, event: Event) {
    const input = event.target as HTMLInputElement;
    const enabled = input.checked;
    shift.saving = true;
    this.condominiumService.updateStaffShift(shift.shift_id, {
      name: shift.name,
      startTime: shift.start_time,
      endTime: shift.end_time,
      weekdays: shift.weekdays,
      enabled,
      staffUserIds: shift.staff.map(member => member.user_id)
    }).subscribe({
      next: () => { shift.enabled = enabled; shift.saving = false; },
      error: err => {
        input.checked = shift.enabled;
        shift.saving = false;
        Swal.fire('Error', err.error?.error || 'No se pudo actualizar el turno.', 'error');
      }
    });
  }
  async deleteShift(condo: Condominium, shift: StaffShift) {
    const result = await Swal.fire({
      title: '¿Eliminar turno?',
      text: shift.name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    this.condominiumService.deleteStaffShift(shift.shift_id).subscribe({
      next: () => { this.loadStaffShifts(condo); Swal.fire('Eliminado', 'Turno eliminado.', 'success'); },
      error: err => Swal.fire('Error', err.error?.error || 'No se pudo eliminar el turno.', 'error')
    });
  }
  toggleBuilding(building: Building) {
    building.expanded = !building.expanded;
  }
  expandAllCondominiums() {
    this.condominiums.forEach(condo => {
      condo.expanded = true;
      condo.buildings.forEach(building => { building.expanded = true; });
    });
  }
  collapseAllCondominiums() {
    this.condominiums.forEach(condo => {
      condo.expanded = false;
      condo.buildings.forEach(building => { building.expanded = false; });
    });
  }
  updateResidentCameraAccess(condo: Condominium, event: Event) {
    const input = event.target as HTMLInputElement;
    const enabled = input.checked;
    condo.cameraAccessSaving = true;
    this.condominiumService.updateResidentCameraAccess(condo.condominium_id, enabled).subscribe({
      next: () => {
        condo.resident_camera_access = enabled;
        condo.cameraAccessSaving = false;
      },
      error: err => {
        console.error('Error updating resident camera access:', err);
        input.checked = condo.resident_camera_access;
        condo.cameraAccessSaving = false;
        Swal.fire('Error', err.error?.error || 'No se pudo actualizar el acceso a cámaras.', 'error');
      }
    });
  }
  async editInvitationSettings(condo: Condominium) {
    const result = await Swal.fire({
      title: 'Configuración de invitaciones',
      html: `
        <div class="invitation-settings-grid">
          <label>Recurrente</label>
          <input id="max-recurrent" type="number" min="0" class="swal2-input" value="${condo.max_recurrent_invitations ?? 10}">
          <span class="invitation-settings-unit">invitaciones</span>

          <label>Temporal</label>
          <input id="max-temporary" type="number" min="1" class="swal2-input" value="${(condo.max_temporary_duration_hours ?? 168) / 24}">
          <span class="invitation-settings-unit">días</span>

          <label>Express</label>
          <input id="max-express" type="number" min="1" class="swal2-input" value="${condo.max_express_duration_hours ?? 3}">
          <span class="invitation-settings-unit">horas</span>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => {
        const recurrent = Number((document.getElementById('max-recurrent') as HTMLInputElement).value);
        const temporaryDays = Number((document.getElementById('max-temporary') as HTMLInputElement).value);
        const expressHours = Number((document.getElementById('max-express') as HTMLInputElement).value);

        if (!Number.isInteger(recurrent) || recurrent < 0 ||
          !Number.isInteger(temporaryDays) || temporaryDays <= 0 ||
          !Number.isInteger(expressHours) || expressHours <= 0) {
          Swal.showValidationMessage('Ingresa valores enteros válidos.');
          return;
        }

        return {
          maxRecurrentInvitations: recurrent,
          maxTemporaryDurationHours: temporaryDays * 24,
          maxExpressDurationHours: expressHours
        };
      }
    });

    if (!result.isConfirmed) return;

    this.condominiumService.updateInvitationSettings(condo.condominium_id, result.value).subscribe({
      next: settings => {
        condo.max_recurrent_invitations = settings.max_recurrent_invitations;
        condo.max_temporary_duration_hours = settings.max_temporary_duration_hours;
        condo.max_express_duration_hours = settings.max_express_duration_hours;
        Swal.fire('Guardado', 'Configuración de invitaciones actualizada.', 'success');
      },
      error: err => Swal.fire('Error', err.error?.error || 'No se pudo actualizar la configuración.', 'error')
    });
  }
  async openCreateCondominium() {
    const result = await Swal.fire({
      title: 'Nuevo Condominio',
      html: `
      <input id="name" class="swal2-input" placeholder="Nombre">
      <input id="address" class="swal2-input" placeholder="Dirección">
      <input id="city" class="swal2-input" placeholder="Ciudad">
    `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => ({
        name: (document.getElementById('name') as HTMLInputElement).value,
        address: (document.getElementById('address') as HTMLInputElement).value,
        city: (document.getElementById('city') as HTMLInputElement).value
      })
    });
    if (!result.isConfirmed) {
      return;
    }
    const data = result.value;
    this.condominiumService.createCondominium(data.name, data.address, data.city).subscribe(() => {
      this.loadCondominiums();
    });
  }
  async editCondominium(condo: any) {
    const { value } = await Swal.fire({
      title: 'Editar condominio',
      html: `
      <input id="name" class="swal2-input" value="${condo.name}" placeholder="Nombre">
      <input id="address" class="swal2-input" value="${condo.address}" placeholder="Dirección">
      <input id="city" class="swal2-input" value="${condo.city}" placeholder="Ciudad">
    `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          name: (document.getElementById('name') as HTMLInputElement).value,
          address: (document.getElementById('address') as HTMLInputElement).value,
          city: (document.getElementById('city') as HTMLInputElement).value,
        };
      }
    });
    if (!value) return;
    this.condominiumService.updateCondominium(condo.condominium_id, value).subscribe(() => {
      this.loadCondominiums();
    });
  }
  async deleteCondominium(condo: any) {
    const result = await Swal.fire({
      title: 'Eliminar Condominio?',
      text: condo.name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    });
    if (!result.isConfirmed) {
      return;
    }
    this.condominiumService.deleteCondominium(condo.condominium_id).subscribe({
      next: () => {
        this.loadCondominiums();
        Swal.fire('Eliminado', 'Condominio eliminado correctamente', 'success');
      },
      error: (err) => {
        if (err.status === 409) {
          Swal.fire('No se puede eliminar', err.error.error, 'warning');
          return;
        }
        Swal.fire('Error', 'Ocurrió un error inesperado.', 'error');
      }
    });
  }
  async openCreateBuilding(condominiumId: string) {
    const result = await Swal.fire({
      title: 'Nuevo Edificio',
      html: `
        <input id="name" class="swal2-input" placeholder="Nombre">
        <input id="floors" type="number" class="swal2-input" placeholder="Cantidad de pisos">
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => ({
        name: (document.getElementById('name') as HTMLInputElement).value,
        floorCount: Number((document.getElementById('floors') as HTMLInputElement).value)
      })
    });
    if (!result.isConfirmed) {
      return;
    }
    this.condominiumService.createBuilding(condominiumId, result.value.name, result.value.floorCount).subscribe(() => {
      this.loadCondominiums();
      Swal.fire('Creado', 'Edificio creado correctamente', 'success');
    });
  }
  async deleteBuilding(building: any) {
    const result = await Swal.fire({
      title: 'Eliminar Torre?',
      text: building.name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    });
    if (!result.isConfirmed) {
      return;
    }
    this.condominiumService.deleteBuilding(building.building_id).subscribe({
      next: () => {
        this.loadCondominiums();
        Swal.fire('Eliminado', 'Torre eliminada correctamente', 'success');
      },
      error: (err) => {
        if (err.status === 409) {
          Swal.fire('No se puede eliminar', err.error.error, 'warning');
          return;
        }
        Swal.fire('Error', 'Ocurrió un error inesperado.', 'error');
      }
    });
  }
  async editBuilding(building: any) {
    const { value } = await Swal.fire({
      title: 'Editar torre',
      html: `
      <input id="name" class="swal2-input" value="${building.name}" placeholder="Nombre">
      <input id="floors" type="number" class="swal2-input" value="${building.floor_count}" placeholder="Cantidad de pisos">
    `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const name = (document.getElementById('name') as HTMLInputElement).value;
        const floorCount = Number((document.getElementById('floors') as HTMLInputElement).value);
        if (!name.trim()) {
          Swal.showValidationMessage('El nombre es obligatorio');
          return;
        }
        if (!Number.isInteger(floorCount) || floorCount <= 0) {
          Swal.showValidationMessage('La cantidad de pisos debe ser un número entero positivo');
          return;
        }
        return { name, floorCount };
      }
    });
    if (!value) {
      return;
    }
    console.log(building.building_id, value);
    this.condominiumService.updateBuilding(building.building_id, value).subscribe(() => {
      this.loadCondominiums();
    });
  }
  async openCreateZone(condominiumId: string) {
    const result = await Swal.fire({
      title: 'Nueva Zona',
      html: `
          <input id="name" class="swal2-input" placeholder="Nombre">
        `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => ({
        name: (document.getElementById('name') as HTMLInputElement).value,
      })
    });
    if (!result.isConfirmed) {
      return;
    }
    this.condominiumService.createZone(condominiumId, result.value.name).subscribe(() => {
      this.loadCondominiums();
      Swal.fire('Creado', 'Zona creada correctamente', 'success');
    });
  }
  async editZone(zone: any) {
    const { value } = await Swal.fire({
      title: 'Editar zona',
      html: `
            <input id="name" class="swal2-input" value="${zone.name}" placeholder="Nombre">
          `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          name: (document.getElementById('name') as HTMLInputElement).value,
        };
      }
    });
    if (!value) return;
    this.condominiumService.updateZone(zone.zone_id, value).subscribe(() => {
      this.loadCondominiums();
    });
  }
  async deleteZone(zone: any) {
    const result = await Swal.fire({
      title: 'Eliminar Zona?',
      text: zone.name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    });
    if (!result.isConfirmed) {
      return;
    }
    this.condominiumService.deleteZone(zone.zone_id).subscribe({
      next: () => {
        this.loadCondominiums();
        Swal.fire('Eliminado', 'Zona eliminada correctamente', 'success');
      },
      error: (err) => {
        if (err.status === 409) {
          Swal.fire('No se puede eliminar', err.error.error, 'warning');
          return;
        }
        Swal.fire('Error', 'Ocurrió un error inesperado.', 'error');
      }
    });
  }
}
