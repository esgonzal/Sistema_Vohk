import { Component, OnInit } from '@angular/core';
import { CondominiumService } from 'src/app/services/vohk_app/condominium.service';
import { DashboardService } from 'src/app/services/vohk_app/dashboard.service';
import { PropertyService } from 'src/app/services/vohk_app/property.service';
import Swal from 'sweetalert2';

interface Condominium {
  condominium_id: string;
  name: string;
  address: string;
  city: string;
  buildings: Building[];
  zones: Zone[];
  expanded?: boolean;
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

  constructor(private propertyService: PropertyService, private condominiumService: CondominiumService) { }

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
          <input id="floors" class="swal2-input" value="${building.floor_count}" placeholder="Cantidad de pisos">
        `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          name: (document.getElementById('name') as HTMLInputElement).value,
          floorCount: (document.getElementById('floors') as HTMLInputElement).value,
        };
      }
    });
    if (!value) return;
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
