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
          console.log("Buildings loaded:", this.buildings);
        },
        error: err => console.error(err)
      });
    this.propertyService.getZones(this.condominiumId)
      .subscribe({
        next: data => {
          this.zones = data;
          console.log("Zones loaded:", this.zones);
          this.loading = false
        },
        error: err => console.error(err)
      })
    this.propertyService.getDevices(this.condominiumId)
      .subscribe({
        next: data => {
          this.devices = data;
          console.log("Devices loaded:", this.devices);
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });
  }
  async openCreateDevice() {
    const zoneOptions = this.zones
      .map(z => `<option value="${z.zone_id}">${z.name}</option>`)
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
      <label>Zona</label>
      <select id="zone" class="swal2-input">
        ${zoneOptions}
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
            zoneId: (document.getElementById('zone') as HTMLSelectElement).value || null,
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
    const zoneOptions = this.zones
      .map(z => ` <option value="${z.zone_id}" ${device.zone_id === z.zone_id ? 'selected' : ''}> ${z.name} </option> `).join('');
    const { value } = await Swal.fire({
      title: 'Editar dispositivo',
      html: `
      <label>Nombre</label>
      <input id="name" class="swal2-input" value="${device.name}">
      <label>Zona</label>
      <select id="zoneId" class="swal2-input">
        ${zoneOptions}
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
          zoneId: (document.getElementById('zoneId') as HTMLSelectElement).value,
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

  manage(building: any) {
    this.router.navigate(['admin/buildings', building.building_id, 'units']);
  }

}