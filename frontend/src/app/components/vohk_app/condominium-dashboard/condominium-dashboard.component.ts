import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from 'src/app/services/vohk_app/property.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-condominium-dashboard',
  templateUrl: './condominium-dashboard.component.html',
  styleUrls: ['./condominium-dashboard.component.css']
})
export class CondominiumDashboardComponent implements OnInit {

  condominiumId!: string;
  buildings: any[] = [];
  zones: any[] = [];
  devices: any[] = [];
  loading = true;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService) { }

  ngOnInit(): void {
    this.condominiumId = this.route.snapshot.paramMap.get('id')!;
    this.loadData();
  }
  loadData() {
    this.loading = true;
    this.propertyService.getBuildings(this.condominiumId)
      .subscribe({
        next: data => {
          this.buildings = data;
        },
        error: err => console.error(err)
      });
    this.propertyService.getZones(this.condominiumId)
      .subscribe({
        next: data => {
          this.zones = data;
          console.log(this.zones)
          this.loading = false
        },
        error: err => console.error(err)
      })
    this.propertyService.getDevices(this.condominiumId)
      .subscribe({
        next: data => {
          this.devices = data;
          console.log(this.devices)
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });
  }
  async openCreateDevice() {
    const buildingOptions = this.buildings
      .map(b => `<option value="${b.building_id}">${b.name}</option>`)
      .join('');
    const result = await Swal.fire({
      title: 'Nuevo Dispositivo',
      html: `
      <label>Tipo</label>
      <select id="type" class="swal2-input">
        <option value="camera">Camera</option>
        <option value="intercom">Intercom</option>
      </select>
      <label>Nombre</label>
      <input id="name" class="swal2-input">
      <label>IP</label>
      <input id="ip" class="swal2-input">
      <label>Puerto</label>
      <input id="port" class="swal2-input" type="number">
      <label>Snapshot URL</label>
      <input id="snapshot" class="swal2-input">
      <label>Stream URL</label>
      <input id="stream" class="swal2-input">
      <label>Building (opcional)</label>
      <select id="building" class="swal2-input">
        <option value="">Sin edificio</option>
        ${buildingOptions}
      </select>
      <div id="intercom-fields" style="display:none">
        <hr>
        <label>SIP Address</label>
        <input id="sip" class="swal2-input">
        <label>Usuario SIP</label>
        <input id="sipUser" class="swal2-input">
        <label>Password SIP</label>
        <input id="sipPassword" class="swal2-input">
        <label>Door ID</label>
        <input id="doorId" class="swal2-input" type="number">
      </div>
    `,
      didOpen: () => {
        const typeSelect = document.getElementById('type') as HTMLSelectElement;
        const intercomFields = document.getElementById('intercom-fields');
        typeSelect.addEventListener('change', () => { intercomFields!.style.display = typeSelect.value === 'intercom' ? 'block' : 'none'; });
      },
      showCancelButton: true,
      preConfirm: () => {
        const type = (document.getElementById('type') as HTMLSelectElement).value;
        return {
          deviceData: {
            condominiumId: this.condominiumId,
            buildingId: (document.getElementById('building') as HTMLSelectElement).value || null,
            type,
            name: (document.getElementById('name') as HTMLInputElement).value,
            ipAddress: (document.getElementById('ip') as HTMLInputElement).value,
            port: Number((document.getElementById('port') as HTMLInputElement).value),
            snapshotUrl: (document.getElementById('snapshot') as HTMLInputElement).value,
            streamUrl: (document.getElementById('stream') as HTMLInputElement).value,
            active: true
          },
          intercomData:
            type === 'intercom'
              ? {
                sipAddress: (document.getElementById('sip') as HTMLInputElement).value,
                username: (document.getElementById('sipUser') as HTMLInputElement).value,
                passwordEncrypted: (document.getElementById('sipPassword') as HTMLInputElement).value,
                doorId: Number((document.getElementById('doorId') as HTMLInputElement).value)
              }
              : null
        };
      }
    })
    if (!result.isConfirmed) { return; }
    this.propertyService.createDevice(result.value)
      .subscribe({
        next: () => {
          Swal.fire(
            'Creado',
            'Dispositivo creado correctamente',
            'success'
          );
          this.loadData();
        },
        error: err => {
          console.error(err);
          Swal.fire(
            'Error',
            'No fue posible crear el dispositivo',
            'error'
          );
        }
      });
  }
  async editDevice(device: any) {
    const isIntercom = device.type === 'intercom';
    const buildingOptions = this.buildings
      .map(b => `
    <option
      value="${b.building_id}"
      ${device.building_id === b.building_id ? 'selected' : ''}
    >
      ${b.name}
    </option>
  `)
      .join('');
    const { value } = await Swal.fire({
      title: 'Editar dispositivo',
      html: `
      <label>Nombre</label>
      <input id="name" class="swal2-input" value="${device.name}">
      <label>Edificio</label>
      <select id="buildingId" class="swal2-input">
        <option value="">Sin edificio</option>
        ${buildingOptions}
      </select>
      <label>IP</label>
      <input id="ip" class="swal2-input" value="${device.ip_address}">
      <label>Puerto</label>
      <input id="port" class="swal2-input" value="${device.port}">
      <label>Snapshot URL</label>
      <input id="snapshot" class="swal2-input" value="${device.snapshot_url}">
      <label>Stream URL</label>
      <input id="stream" class="swal2-input" value="${device.stream_url}">
      <label>Activo</label>
      <select id="active" class="swal2-input">
        <option value="true" ${device.active ? 'selected' : ''}>
          Activo
        </option>
        <option value="false" ${!device.active ? 'selected' : ''}>
          Inactivo
        </option>
      </select>
      ${isIntercom
          ? `
            <hr>
            <label>SIP Address</label>
            <input id="sipAddress" class="swal2-input" value="${device.sip_address ?? ''}">
            <label>Usuario SIP</label>
            <input id="sipUsername" class="swal2-input" value="${device.sip_username ?? ''}">
            <label>Password SIP</label>
            <input id="sipPassword" class="swal2-input" value="${device.password_encrypted ?? ''}">
            <label>Door ID</label>
            <input id="doorId" class="swal2-input" value="${device.door_id ?? ''}">
          `
          : ''
        }
    `,
      showCancelButton: true,
      preConfirm: () => ({
        deviceData: {
          name: (document.getElementById('name') as HTMLInputElement).value,
          buildingId: (document.getElementById('buildingId') as HTMLSelectElement).value || null,
          ipAddress: (document.getElementById('ip') as HTMLInputElement).value,
          port: Number((document.getElementById('port') as HTMLInputElement).value),
          snapshotUrl: (document.getElementById('snapshot') as HTMLInputElement).value,
          streamUrl: (document.getElementById('stream') as HTMLInputElement).value,
          active: (document.getElementById('active') as HTMLSelectElement).value === 'true'
        },
        intercomData: isIntercom
          ? {
            sipAddress: (document.getElementById('sipAddress') as HTMLInputElement).value,
            username: (document.getElementById('sipUsername') as HTMLInputElement).value,
            passwordEncrypted: (document.getElementById('sipPassword') as HTMLInputElement).value,
            doorId: Number((document.getElementById('doorId') as HTMLInputElement).value)
          }
          : null
      })
    });
    if (!value) { return; }
    this.propertyService.updateDevice(device.device_id, value)
      .subscribe(() => {
        Swal.fire(
          'Actualizado',
          'Dispositivo actualizado correctamente',
          'success'
        );
        this.loadData();
      });
  }
  async deleteDevice(device: any) {
    const result = await Swal.fire({
      title: 'Eliminar dispositivo?',
      text: device.name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    });
    if (!result.isConfirmed) { return; }
    this.propertyService.deleteDevice(device.device_id)
      .subscribe(() => {
        this.loadData();
        Swal.fire(
          'Eliminado',
          'Dispositivo eliminado correctamente',
          'success'
        );
      });
  }
  async openLiveView(device: any) {
    console.log(device)
    await Swal.fire({
      title: device.name,
      width: '90%',
      html: `
      <iframe
        src="${device.stream_url}"
        width="100%"
        height="600"
        style="border:none;"
        allow="camera; microphone; autoplay; fullscreen">
      </iframe>
    `,
      showConfirmButton: false,
      showCloseButton: true
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
        this.loadData();
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
        this.loadData();
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
        this.loadData();
      });
  }
  async openCreateZone() {
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
    this.propertyService.createZone(this.condominiumId, result.value.name)
      .subscribe(() => {
        this.loadData();
        Swal.fire(
          'Creado',
          'Zona creada correctamente',
          'success'
        );
      });
  }
  async editZone(zone: any) {
    console.log(zone)
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
    this.propertyService.updateZone(zone.zone_id, value)
      .subscribe(() => {

        this.loadData();
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
    this.propertyService.deleteZone(zone.zone_id).subscribe({
      next: () => {
        this.loadData();
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
  manage(building: any) {
    this.router.navigate(['/buildings', building.building_id, 'units']);
  }
  goBack() {
    this.router.navigate(['/condominiums']);
  }

}