import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PropertyService } from 'src/app/services/vohk_app/property.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-condominiums',
  templateUrl: './condominiums.component.html',
  styleUrls: ['./condominiums.component.css']
})
export class CondominiumsComponent implements OnInit {
  condominiums: any[] = [];
  name = '';
  address = '';
  city = '';

  constructor(private propertyService: PropertyService, private router: Router) { }

  ngOnInit(): void {
    this.loadCondominiums();
  }
  loadCondominiums() {
    this.propertyService.getCondominiums().subscribe({
      next: data => {
        this.condominiums = data;
        console.log(this.condominiums);
      },
      error: err => {
        console.error(err);
      }
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
    this.propertyService.createCondominium(data.name, data.address, data.city)
      .subscribe(() => {
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
    this.propertyService.deleteCondominium(condo.condominium_id).subscribe({
      next: () => {
        this.loadCondominiums();
        Swal.fire('Eliminado', 'Condominio eliminada correctamente', 'success');
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
    this.propertyService.updateCondominium(condo.condominium_id, value)
      .subscribe(() => {
        this.loadCondominiums();
      });
  }
  manage(condo: any) {
    this.router.navigate(['admin/condominiums', condo.condominium_id]);
  }
}
