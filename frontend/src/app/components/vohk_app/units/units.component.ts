import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SelectedCondominium, SelectedCondominiumService } from 'src/app/services/vohk_app/selected-condominium.service';
import { UnitService } from 'src/app/services/vohk_app/unit.service';
import { UserService } from 'src/app/services/vohk_app/user.service';
import { TwilioService } from 'src/app/services/vohk_app/twilio.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-units',
  templateUrl: './units.component.html',
  styleUrls: ['./units.component.css']
})
export class UnitsComponent implements OnInit, OnDestroy {

  unitGroups: any = null;
  selectedCondominium: SelectedCondominium | null = null;
  loading = true;
  unitQuery = '';
  unitStats = { total: 0, occupied: 0, vacant: 0, condosWithUnits: 0, condosEmpty: 0 };
  private destroy$ = new Subject<void>();

  constructor(
    private unitService: UnitService,
    private userService: UserService,
    private twilioService: TwilioService,
    private selectedCondominiumService: SelectedCondominiumService
  ) { }

  ngOnInit(): void {
    this.selectedCondominiumService.selected$.pipe(takeUntil(this.destroy$)).subscribe(condo => {
      this.selectedCondominium = condo;
      if (!condo) {
        this.unitGroups = null;
        this.loading = false;
        return;
      }
      this.loadUnitTree(condo.condominium_id);
    });
  }
  loadUnitTree(condominiumId: string): void {
    this.loading = true;
    this.unitService.getUnitTree(condominiumId).subscribe({
      next: data => {
        console.log('UNIT TREE:', data);
        this.unitGroups = data;
        this.unitGroups?.buildings?.forEach((building: any) => {
          building.expanded = false;
        });
        this.calculateStats();
        this.loading = false;
      },
      error: err => {
        console.error('Error loading unit tree:', err);
        this.unitGroups = null;
        this.loading = false;
      }
    });
  }
  calculateStats(): void {
    let total = 0;
    let occupied = 0;
    this.unitGroups?.buildings?.forEach((building: any) => {
      building.units?.forEach((unit: any) => {
        total++;
        if (unit.residents?.length) {
          occupied++;
        }
      });
    });
    this.unitStats = { total, occupied, vacant: total - occupied, condosWithUnits: total > 0 ? 1 : 0, condosEmpty: total === 0 ? 1 : 0 };
  }
  getFilteredUnits(building: any): any[] {
    if (!this.unitQuery.trim()) {
      return building.units;
    }
    const query = this.unitQuery.toLowerCase().trim();
    return building.units.filter((unit: any) => {
      const residents = unit.residents?.map((resident: any) => resident.legal_name).join(' ') ?? '';
      const text = `${unit.name ?? ''} ${unit.room_no ?? ''} ${unit.floor ?? ''} ${residents}`.toLowerCase();
      return text.includes(query);
    });
  }
  toggleBuilding(building: any): void {
    building.expanded = !building.expanded;
  }
  expandAllUnits(): void {
    this.unitGroups?.buildings?.forEach((building: any) => { building.expanded = true; });
  }
  collapseAllUnits(): void {
    this.unitGroups?.buildings?.forEach((building: any) => { building.expanded = false; });
  }
  async openCreateUnit(building: any): Promise<void> {
    const result = await Swal.fire({
      title: `Nueva Unidad · ${building.name}`,
      html: `
        <input id="name" class="swal2-input" placeholder="Nombre">
        <input id="roomNo" class="swal2-input" placeholder="Número">
        <input id="floor" type="number" class="swal2-input" placeholder="Piso">
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById('name') as HTMLInputElement).value.trim();
        const roomNo = (document.getElementById('roomNo') as HTMLInputElement).value.trim();
        const floorValue = (document.getElementById('floor') as HTMLInputElement).value;
        if (!name || !roomNo || floorValue === '') {
          Swal.showValidationMessage('Nombre, número y piso son obligatorios');
          return;
        }
        return { name, roomNo, floor: Number(floorValue) };
      }
    });
    if (!result.isConfirmed || !result.value) {
      return;
    }
    this.unitService.createUnit(building.building_id, result.value.name, result.value.roomNo, result.value.floor).subscribe({
      next: () => {
        Swal.fire('Unidad creada', 'La unidad fue creada correctamente.', 'success');
        this.reloadUnitTree();
      },
      error: err => {
        console.error('Error creating unit:', err);
        Swal.fire('Error', err.error?.error || 'No se pudo crear la unidad.', 'error');
      }
    });
  }
  async editUnit(unit: any): Promise<void> {
    const result = await Swal.fire({
      title: 'Editar Unidad',
      html: `
        <input id="name" class="swal2-input" value="${unit.name ?? ''}" placeholder="Nombre">
        <input id="roomNo" class="swal2-input" value="${unit.room_no ?? ''}" placeholder="Número">
        <input id="floor" type="number" class="swal2-input" value="${unit.floor ?? ''}" placeholder="Piso">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const name = (document.getElementById('name') as HTMLInputElement).value.trim();
        const roomNo = (document.getElementById('roomNo') as HTMLInputElement).value.trim();
        const floorValue = (document.getElementById('floor') as HTMLInputElement).value;
        if (!name || !roomNo || floorValue === '') {
          Swal.showValidationMessage('Nombre, número y piso son obligatorios');
          return;
        }
        return { name, roomNo, floor: Number(floorValue) };
      }
    });
    if (!result.isConfirmed || !result.value) {
      return;
    }
    this.unitService.updateUnit(unit.unit_id, result.value.name, result.value.roomNo, result.value.floor).subscribe({
      next: () => {
        Swal.fire('Unidad actualizada', 'La unidad fue actualizada correctamente.', 'success');
        this.reloadUnitTree();
      },
      error: err => {
        console.error('Error updating unit:', err);
        Swal.fire('Error', err.error?.error || 'No se pudo actualizar la unidad.', 'error');
      }
    });
  }
  async deleteUnit(unit: any): Promise<void> {
    const result = await Swal.fire({
      title: '¿Eliminar unidad?',
      text: `Unidad ${unit.room_no}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) {
      return;
    }
    this.unitService.deleteUnit(unit.unit_id).subscribe({
      next: () => {
        Swal.fire('Unidad eliminada', 'La unidad fue eliminada correctamente.', 'success');
        this.reloadUnitTree();
      },
      error: err => {
        console.error('Error deleting unit:', err);
        if (err.status === 409) {
          Swal.fire('No se puede eliminar', err.error?.error, 'warning');
          return;
        }
        Swal.fire('Error', err.error?.error || 'No se pudo eliminar la unidad.', 'error');
      }
    });
  }
  async openCreateResident(unit: any): Promise<void> {
    const result = await Swal.fire({
      title: `Agregar residente · ${unit.name}`,
      html: `
      <input id="legalName" class="swal2-input" placeholder="Nombre completo">
      <input id="rut" class="swal2-input" placeholder="RUT">
      <input id="email" type="email" class="swal2-input" placeholder="Correo electrónico">
      <label class="swal-resident-checkbox">
        <input id="isPrimary" type="checkbox">
        Residente principal
      </label>
    `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const legalName = (document.getElementById('legalName') as HTMLInputElement).value.trim();
        const rut = (document.getElementById('rut') as HTMLInputElement).value.trim();
        const email = (document.getElementById('email') as HTMLInputElement).value.trim();
        const isPrimary = (document.getElementById('isPrimary') as HTMLInputElement).checked;
        if (!legalName || !rut || !email) {
          Swal.showValidationMessage('Nombre, RUT y correo son obligatorios');
          return;
        }
        return { legalName, rut, email, isPrimary };
      }
    });
    if (!result.isConfirmed || !result.value) {
      return;
    }
    console.log(unit.unit_id, result.value.legalName, result.value.rut, result.value.email, result.value.isPrimary)
    this.unitService.createResident(unit.unit_id, result.value.legalName, result.value.rut, result.value.email, result.value.isPrimary).subscribe({
      next: () => {
        Swal.fire('Residente agregado', 'El residente fue vinculado correctamente.', 'success');
        this.reloadUnitTree();
      },
      error: err => {
        console.error('Error creating resident:', err);
        if (err.status === 409) {
          Swal.fire('No se pudo agregar', err.error?.error, 'warning');
          return;
        }
        Swal.fire('Error', err.error?.error || 'No se pudo agregar el residente.', 'error');
      }
    });
  }
  async removeResident(unit: any): Promise<void> {
    if (!unit.residents?.length) {
      Swal.fire('Sin residentes', 'Esta unidad no tiene residentes asignados.', 'info');
      return;
    }
    const residents = unit.residents.map((resident: any) => `
    <option value="${resident.user_id}">
      ${resident.legal_name}${resident.is_primary ? ' · Principal' : ''}
    </option>
  `).join('');
    const result = await Swal.fire({
      title: `Remover residente · ${unit.name}`,
      html: `
      <select id="residentId" class="swal2-select">
        ${residents}
      </select>
    `,
      showCancelButton: true,
      confirmButtonText: 'Remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      preConfirm: () => {
        const residentId = (document.getElementById('residentId') as HTMLSelectElement).value;
        if (!residentId) {
          Swal.showValidationMessage('Selecciona un residente');
          return;
        }
        return residentId;
      }
    });
    if (!result.isConfirmed || !result.value) {
      return;
    }
    const resident = unit.residents.find((item: any) => item.user_id === result.value);
    const confirmation = await Swal.fire({
      title: '¿Remover residente?',
      text: `${resident.legal_name} dejará de estar vinculado a la unidad ${unit.name}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });
    if (!confirmation.isConfirmed) {
      return;
    }
    this.unitService.removeResident(result.value, unit.unit_id).subscribe({
      next: response => {
        const message = response.removedFromCondo
          ? 'El residente fue removido de la unidad y se eliminaron sus accesos del condominio.'
          : 'El residente fue removido de la unidad. Sus accesos se mantuvieron porque aún pertenece a otra unidad del condominio.';
        Swal.fire('Residente removido', message, 'success');
        this.reloadUnitTree();
      },
      error: err => {
        console.error('Error removing resident:', err);
        Swal.fire('Error', err.error?.error || 'No se pudo remover al residente.', 'error');
      }
    });
  }
  reloadUnitTree(): void {
    if (!this.selectedCondominium) {
      return;
    }
    this.loadUnitTree(this.selectedCondominium.condominium_id);
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  async callResident(resident: any): Promise<void> {
    if (!resident.sip_identity) {
      return;
    }
    try {
      await this.twilioService.call(resident.sip_identity);
      Swal.fire({
        title: 'Llamando',
        text: resident.legal_name,
        icon: 'info',
        showCancelButton: true,
        showConfirmButton: false,
        cancelButtonText: 'Colgar',
        allowOutsideClick: false
      }).then(() => {
        this.twilioService.disconnectCall();
      });
    } catch (error: any) {
      console.error('Unable to start call:', error);
      Swal.fire('Error', error.message || 'No se pudo iniciar la llamada.', 'error');
    }
  }

}