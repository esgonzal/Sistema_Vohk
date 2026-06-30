import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from 'src/app/services/vohk_app/property.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-residents',
  templateUrl: './residents.component.html',
  styleUrls: ['./residents.component.css']
})
export class ResidentsComponent implements OnInit {
  unitId: string;
  residents: any[] = []

  constructor(
    private route: ActivatedRoute,
    private propertyService: PropertyService,
    private router: Router,) { }

  ngOnInit() {
    this.unitId = this.route.snapshot.paramMap.get('id')!;
    this.loadResidents(this.unitId);
  }
  loadResidents(unitId: string) {
    this.propertyService.getResidents(unitId).subscribe({
      next: data => {
        this.residents = data;
        console.log(this.residents)
      },
      error: err => {
        console.error(err);
      }
    });
  }
  async openCreateResident() {
    const result = await Swal.fire({
      title: 'Nuevo Residente',
      html: `
      <input id="legalName" class="swal2-input" placeholder="Nombre Completo">
      <input id="rut" class="swal2-input" placeholder="Rut">
      <input id="email" class="swal2-input" placeholder="Email">
      <label style="display:block;margin-top:10px;">
        <input id="isPrimary" type="checkbox">
        Residente principal
      </label>
    `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => ({
        legalName: (document.getElementById('legalName') as HTMLInputElement).value,
        rut: (document.getElementById('rut') as HTMLInputElement).value,
        email: (document.getElementById('email') as HTMLInputElement).value,
        isPrimary: (document.getElementById('isPrimary') as HTMLInputElement).checked
      })
    });
    if (!result.isConfirmed) {
      return;
    }
    this.propertyService.createResident(this.unitId, result.value.legalName, result.value.rut, result.value.email, result.value.isPrimary)
      .subscribe({
        next: () => {
          Swal.fire(
            'Creado',
            'Residente creado correctamente',
            'success'
          );
          this.loadResidents(this.unitId);
        },
        error: (err) => {
          console.error(err);
          Swal.fire(
            'Error',
            'No fue posible crear el residente',
            'error'
          );
        }
      });
  }
  async deleteResident(resident: any) {
    const result = await Swal.fire({
      title: 'Eliminar residente?',
      text: resident.legal_name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    });
    if (!result.isConfirmed) {
      return;
    }
    console.log("Se quiere remover un usuario: ",resident.name," de la unidad: ",this.unitId)
    this.propertyService.deleteResident(resident.user_id, this.unitId)
      .subscribe(() => {
        this.loadResidents(this.unitId);
        Swal.fire(
          'Eliminado',
          'Residente eliminado correctamente',
          'success'
        );
      });
  }
  async editResident(resident: any) {
    const { value } = await Swal.fire({
      title: 'Editar residente',
      html: `
      <input id="legalName" class="swal2-input" value="${resident.legal_name}" placeholder="Nombre Completo">
      <input id="email" class="swal2-input" value="${resident.email ?? ''}" placeholder="Email">
      <label style="display:block;margin-top:10px;">
        <input id="isPrimary" type="checkbox" ${resident.is_primary ? 'checked' : ''}>
        Residente principal
      </label>
    `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => {
        return {
          legalName: (document.getElementById('legalName') as HTMLInputElement).value,
          email: (document.getElementById('email') as HTMLInputElement).value,
          isPrimary: (document.getElementById('isPrimary') as HTMLInputElement).checked
        };
      }
    });
    if (!value) return;
    this.propertyService.updateResident(resident.user_id, this.unitId, value)
      .subscribe(() => {
        this.loadResidents(this.unitId);
      });
  }
  goBack() {
    window.history.back();
  }

}
