import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from 'src/app/services/vohk_app/property.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-buildings',
  templateUrl: './buildings.component.html',
  styleUrls: ['./buildings.component.css']
})
export class BuildingsComponent implements OnInit {

  condominiumId!: string;
  buildings: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private propertyService: PropertyService,
    private router: Router,) { }

  ngOnInit() {
    this.condominiumId = this.route.snapshot.paramMap.get('id')!;
    this.loadBuildings(this.condominiumId)
  }
  loadBuildings(condominiumId: string) {
    this.propertyService.getBuildings(condominiumId!).subscribe({
      next: data => {
        this.buildings = data;
        console.log(this.buildings)
      },
      error: err => {
        console.error(err);
      }
    });
  }
  async openCreateBuilding() {
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
    this.propertyService.createBuilding(this.condominiumId, result.value.name, result.value.floorCount)
      .subscribe(() => {
        this.loadBuildings(this.condominiumId);
        Swal.fire(
          'Creado',
          'Edificio creado correctamente',
          'success'
        );
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
    this.propertyService.deleteBuilding(building.building_id).subscribe({
      next: () => {
        this.loadBuildings(this.condominiumId);
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
    this.propertyService.updateBuilding(building.building_id, value)
      .subscribe(() => {
        this.loadBuildings(this.condominiumId);
      });
  }
  manage(building: any) {
    this.router.navigate(['/buildings', building.building_id, 'units']);
  }
  goBack() {
    window.history.back();
  }
}
