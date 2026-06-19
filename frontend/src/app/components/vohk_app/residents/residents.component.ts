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
      <input id="username" class="swal2-input" placeholder="Usuario">
      <input id="password" class="swal2-input" placeholder="Contraseña">
      <input id="identity" class="swal2-input" placeholder="identity(SIP)">
      <input id="email" class="swal2-input" placeholder="Email">
      <input id="legalName" class="swal2-input" placeholder="Nombre Completo">
      <label style="display:block;margin-top:10px;">
        <input id="isPrimary" type="checkbox">
        Residente principal
      </label>
    `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => ({
        username: (document.getElementById('username') as HTMLInputElement).value,
        password: (document.getElementById('password') as HTMLInputElement).value,
        identity: (document.getElementById('identity') as HTMLInputElement).value,
        email: (document.getElementById('email') as HTMLInputElement).value,
        legalName: (document.getElementById('legalName') as HTMLInputElement).value,
        isPrimary: (document.getElementById('isPrimary') as HTMLInputElement).checked
      })
    });
    if (!result.isConfirmed) {
      return;
    }
    this.propertyService.createResident(this.unitId, result.value.username, result.value.password, result.value.identity, result.value.email, result.value.legalName, result.value.isPrimary)
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
    this.propertyService.deleteResident(resident.user_id)
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
      <input id="username" class="swal2-input" value="${resident.username}" placeholder="Usuario">
      <input id="identity" class="swal2-input" value="${resident.identity}" placeholder="Identidad">
      <input id="email" class="swal2-input" value="${resident.email}" placeholder="Email">
      <input id="legalName" class="swal2-input" value="${resident.legal_name}" placeholder="Nombre Completo">
      <select id="active" class="swal2-input">
        <option value="true" ${resident.active ? 'selected' : ''}>Activo</option>
        <option value="false" ${!resident.active ? 'selected' : ''}>Inactivo</option>
      </select>
    `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => {
        return {
          username: (document.getElementById('username') as HTMLInputElement).value,
          identity: (document.getElementById('identity') as HTMLInputElement).value,
          email: (document.getElementById('email') as HTMLInputElement).value,
          legalName: (document.getElementById('name') as HTMLInputElement).value,
          active: (document.getElementById('active') as HTMLSelectElement).value === 'true'
        };
      }
    });
    if (!value) return;
    this.propertyService.updateResidente(resident.user_id, value)
      .subscribe(() => {
        this.loadResidents(this.unitId);
      });
  }
  goBack() {
    window.history.back();
  }

}
