import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from 'src/app/services/vohk_app/property.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-units',
  templateUrl: './units.component.html',
  styleUrls: ['./units.component.css']
})
export class UnitsComponent implements OnInit {

  buildingId: string;
  units: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private propertyService: PropertyService,
    private router: Router,) { }

  ngOnInit() {
    this.buildingId = this.route.snapshot.paramMap.get('id')!;
    this.loadUnits(this.buildingId)
  }
  loadUnits(buildingId: string) {
    this.propertyService.getUnits(buildingId).subscribe({
      next: data => {
        this.units = data;
      },
      error: err => {
        console.error(err);
      }
    });
  }
  async openCreateUnit() {
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
    this.propertyService.createUnit(this.buildingId, result.value.name, result.value.number, result.value.floor)
      .subscribe(() => {
        this.loadUnits(this.buildingId);
        Swal.fire(
          'Creada',
          'Unidad creada correctamente',
          'success'
        );
      });
  }
  async deleteUnit(unit: any) {
    const result = await Swal.fire({
      title: 'Eliminar Unidad?',
      text: unit.number,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    });
    if (!result.isConfirmed) {
      return;
    }
    this.propertyService.deleteUnit(unit.unit_id).subscribe({
      next: () => {
        this.loadUnits(this.buildingId);
        Swal.fire('Eliminado', 'Unidad eliminada correctamente', 'success');
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
  async editUnit(unit: any) {
    const { value } = await Swal.fire({
      title: 'Editar Unidad',
      html: `
          <input id="name" class="swal2-input" value="${unit.name}" placeholder="Número">
          <input id="number" class="swal2-input" value="${unit.number}" placeholder="Número">
          <input id="floor" class="swal2-input" value="${unit.floor}" placeholder="Piso">
        `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          name: (document.getElementById('name') as HTMLInputElement).value,
          number: (document.getElementById('number') as HTMLInputElement).value,
          floor: (document.getElementById('floor') as HTMLInputElement).value,
        };
      }
    });
    if (!value) return;
    this.propertyService.updateUnit(unit.unit_id, value)
      .subscribe(() => {
        this.loadUnits(this.buildingId);
      });
  }
  manage(unit: any) {
    this.router.navigate(['admin/units', unit.unit_id, 'residents']);
  }
  goBack() {
    window.history.back();
  }
}
