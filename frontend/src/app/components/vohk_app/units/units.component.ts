import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PropertyService } from 'src/app/services/vohk_app/property.service';
import { SelectedCondominium, SelectedCondominiumService } from 'src/app/services/vohk_app/selected-condominium.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-units',
  templateUrl: './units.component.html',
  styleUrls: ['./units.component.css']
})
export class UnitsComponent implements OnInit, OnDestroy {

  condominiums: any[] = [];
  unitGroups: any = null;
  selectedCondominium: SelectedCondominium | null = null;
  loading = true;
  unitQuery = '';
  unitStats = { total: 0, occupied: 0, vacant: 0, condosWithUnits: 0, condosEmpty: 0 };
  private destroy$ = new Subject<void>();

  constructor(
    private propertyService: PropertyService,
    private selectedCondominiumService: SelectedCondominiumService
  ) { }

  ngOnInit(): void {
    this.selectedCondominiumService.selected$.pipe(takeUntil(this.destroy$)).subscribe(condo => {
      this.selectedCondominium = condo;
      if (!condo) {
        this.condominiums = [];
        this.unitGroups = [];
        this.loading = false;
        return;
      }
      this.loadUnitTree(condo.condominium_id);
    });
  }
  loadUnitTree(condominiumId: string): void {
    this.loading = true;
    this.propertyService.getUnitTree(condominiumId).subscribe({
      next: data => {
        console.log('UNIT TREE:', data);
        this.unitGroups = data;
        this.calculateStats();
        this.loading = false;
      },
      error: err => {
        console.error('Error loading unit tree:', err);
        this.condominiums = [];
        this.unitGroups = [];
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
    this.unitStats = {
      total, occupied, vacant: total - occupied, condosWithUnits: total > 0 ? 1 : 0, condosEmpty: total === 0 ? 1 : 0
    };
  }
  toggleCondo(condo: any): void {
    condo.expanded = !condo.expanded;
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
  async openCreateUnit(): Promise<void> {
    const result = await Swal.fire({
      title: 'Nueva Unidad',
      html: `
        <input id="name" class="swal2-input" placeholder="Nombre">
        <input id="room_no" class="swal2-input" placeholder="Número">
        <input id="floor" type="number" class="swal2-input" placeholder="Piso">
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => ({
        name: (document.getElementById('name') as HTMLInputElement).value,
        number: (document.getElementById('room_no') as HTMLInputElement).value,
        floor: Number((document.getElementById('floor') as HTMLInputElement).value)
      })
    });
    if (!result.isConfirmed) {
      return;
    }
    // Crear unidad pendiente de asociar a building seleccionado
  }
  async deleteUnit(unit: any): Promise<void> {
    const result = await Swal.fire({
      title: 'Eliminar Unidad?',
      text: unit.room_no,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    });
    if (!result.isConfirmed) {
      return;
    }
    this.propertyService.deleteUnit(unit.unit_id).subscribe({
      next: () => {
        Swal.fire('Eliminado', 'Unidad eliminada correctamente', 'success');
      },
      error: err => {
        if (err.status === 409) {
          Swal.fire('No se puede eliminar', err.error.error, 'warning');
          return;
        }
        Swal.fire('Error', 'Ocurrió un error inesperado.', 'error');
      }
    });
  }
  async editUnit(unit: any): Promise<void> {
    const { value } = await Swal.fire({
      title: 'Editar Unidad',
      html: `
        <input id="name" class="swal2-input" value="${unit.name ?? ''}" placeholder="Nombre">
        <input id="number" class="swal2-input" value="${unit.room_no ?? ''}" placeholder="Número">
        <input id="floor" class="swal2-input" value="${unit.floor ?? ''}" placeholder="Piso">
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => ({
        name: (document.getElementById('name') as HTMLInputElement).value,
        number: (document.getElementById('number') as HTMLInputElement).value,
        floor: (document.getElementById('floor') as HTMLInputElement).value
      })
    });
    if (!value) {
      return;
    }
    this.propertyService.updateUnit(unit.unit_id, value).subscribe();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}