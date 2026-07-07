import { Component, Input, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { lastValueFrom } from 'rxjs';
import moment from 'moment';
import { Fingerprint } from 'src/app/Interfaces/Elements';
import { FingerprintServiceService } from 'src/app/services/fingerprint-service.service';
import Swal from 'sweetalert2';
import { operationResponse } from 'src/app/Interfaces/API_responses';

@Component({
  selector: 'app-fingerprint-table',
  templateUrl: './fingerprint-table.component.html',
  styleUrls: ['./fingerprint-table.component.css']
})
export class FingerprintTableComponent implements OnInit, AfterViewInit {

  @Input() lockId!: number;
  @Input() accessToken!: string;
  fingerprints: any[] = [];
  displayedColumns = ['Nombre', 'Responsable', 'Fecha', 'Periodo_validez', 'Valido', 'Botones'];
  searchText = '';
  dataSource = new MatTableDataSource<any>();
  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;
  isLoading: boolean = false;

  constructor(
    public fingerprintService: FingerprintServiceService) { }

  async ngOnInit() {
    await this.loadFingerprints();
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'Nombre':
          return item.fingerprintName?.toLowerCase();
        case 'Responsable':
          return item.senderUsername?.toLowerCase();
        case 'Fecha':
          return item.createDate;
        case 'Periodo_validez':
          return item.endDate;
        case 'Valido':
          return item.displayStatus.text;
        default:
          return item[property];
      }
    };
  }
  async loadFingerprints() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.fingerprintService.getFingerprintsofLock(this.accessToken, this.lockId));
      this.fingerprints = (response?.list ?? []).map(fingerprint => ({
        ...fingerprint,
        displayStatus: this.consultarEstado(fingerprint.endDate)
      }));
      this.dataSource.data = this.fingerprints;
      console.log(this.fingerprints)
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }
  async refresh() {
    await this.loadFingerprints();
  }
  searchFingerprints() {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }
  formatTimestamp(timestamp: number): string {
    return moment(timestamp).format('DD/MM/YYYY HH:mm');
  }
  periodoValidez(fingerprint: Fingerprint): string {
    if (fingerprint.fingerprintType === 1) {
      return this.periodoSimple(fingerprint.startDate, fingerprint.endDate);
    }
    const inicio = moment(fingerprint.startDate);
    const fin = moment(fingerprint.endDate);
    const dias: string[] = [];
    let minutosInicio = "0";
    let minutosFin = "0";
    const nombresDias = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    for (const ciclo of fingerprint.cyclicConfig) {
      dias.push(nombresDias[ciclo.weekDay]);
      minutosInicio = ciclo.startTime;
      minutosFin = ciclo.endTime;
    }
    const horaInicio = moment(fingerprint.startDate).add(minutosInicio, 'minutes').format('HH:mm');
    const horaFin = moment(fingerprint.endDate).add(minutosFin + 1, 'minutes').format('HH:mm');
    return `${inicio.format('DD/MM/YYYY')} - ${fin.format('DD/MM/YYYY')}${dias.join(', ')}${horaInicio} ~ ${horaFin}`;
  }
  private periodoSimple(start: number, end: number): string {
    if (end === 0) {
      return 'Permanente';
    }
    return `${moment(start).format('DD/MM/YYYY HH:mm')} - ${moment(end).format('DD/MM/YYYY HH:mm')}`;
  }
  private consultarEstado(end: number): { text: string; color: string } {
    if (end === 0) {
      return { text: 'Valido', color: 'green' };
    }
    if (moment(end).isBefore(moment())) {
      return { text: 'Caducado', color: 'red' };
    }
    return { text: 'Valido', color: 'green' };
  }
  async borrarFingerprint(fingerID: number) {
    const result = await Swal.fire({
      title: 'Eliminar huella',
      text: '¿Está seguro que desea eliminar esta huella?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      confirmButtonColor: '#d33',
    });
    if (!result.isConfirmed) {
      return;
    }
    try {
      const response = await lastValueFrom(this.fingerprintService.deleteFingerprint(this.accessToken, this.lockId, fingerID)) as operationResponse;
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'huella eliminada', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else {
        console.log(response)
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible eliminar la huella.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async cambiarNombreFingerprint(fingerID: number) {
    const { value: name } = await Swal.fire({
      title: 'Nuevo nombre',
      input: 'text',
      inputLabel: 'Nombre',
      inputPlaceholder: 'Ingrese el nuevo nombre',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Por favor ingrese un nombre';
        }
        return null;
      }
    });
    if (!name) {
      return;
    }
    try {
      const response = await lastValueFrom(this.fingerprintService.changeName(this.accessToken, this.lockId, fingerID, name)) as operationResponse;
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'Nombre actualizado', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else if (response.errcode === -3) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'El nombre ingresado es muy largo.', });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible cambiar el nombre.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async cambiarPeriodoFingerprint(fingerID: number) {
    const { value } = await Swal.fire({
      title: 'Cambiar período de huella',
      html: `
        <div style="display:flex; flex-direction:column; gap:12px; text-align:left">
          <label>Inicio</label>
          <input id="startDate" type="date" class="swal2-input">
          <label>Término</label>
          <input id="endDate" type="date" class="swal2-input">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const popup = Swal.getPopup()!;
        const startDate = (popup.querySelector('#startDate') as HTMLInputElement).value;
        const endDate = (popup.querySelector('#endDate') as HTMLInputElement).value;
        if (!startDate) {
          Swal.showValidationMessage('Debe ingresar fecha de inicio.');
          return;
        }
        if (!endDate) {
          Swal.showValidationMessage('Debe ingresar fecha de término.');
          return;
        }
        const start = new Date(`${startDate}T00:01`);
        const end = new Date(`${endDate}T23:59`);
        if (end <= start) {
          Swal.showValidationMessage('La fecha de término debe ser posterior a la de inicio.');
          return;
        }
        return { start, end };
      }
    });
    if (!value) return;
    this.isLoading = true;
    try {
      const startDate = value.permanent ? 0 : moment(value.start).valueOf();
      const endDate = value.permanent ? 0 : moment(value.end).valueOf();
      const response = await lastValueFrom(this.fingerprintService.changePeriod(this.accessToken, this.lockId, fingerID, startDate, endDate)) as operationResponse;
      console.log(response)
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'Período actualizado', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible cambiar el período.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    } finally {
      this.isLoading = false;
    }
  }
}