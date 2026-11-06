import { Component, Input, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { lastValueFrom } from 'rxjs';
import moment from 'moment';
import { Passcode } from 'src/app/Interfaces/Elements';
import { PasscodeServiceService } from 'src/app/services/passcode-service.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { LockData } from 'src/app/Interfaces/Lock';
import { Router } from '@angular/router';
import { PopUpService } from 'src/app/services/pop-up.service';
import Swal from 'sweetalert2';
import { createPasscodeResponse, operationResponse } from 'src/app/Interfaces/API_responses';

@Component({
  selector: 'app-passcode-table',
  templateUrl: './passcode-table.component.html',
  styleUrls: ['./passcode-table.component.css']
})
export class PasscodeTableComponent implements OnInit, AfterViewInit {

  @Input() lockId!: number;
  @Input() accessToken!: string;
  @Input() locksOfGroup: LockData[] = [];
  passcodes: Passcode[] = [];
  displayedColumns = ['Nombre', 'Contrasena', 'Responsable', 'Fecha', 'Periodo_validez', 'Valido', 'Botones'];
  searchText = '';
  dataSource = new MatTableDataSource<Passcode>();
  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;
  isLoading: boolean = false;

  constructor(
    public passcodeService: PasscodeServiceService,
    public lockService: LockServiceService,
    private popupService: PopUpService,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.loadPasscodes();
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'Nombre':
          return Number(item.keyboardPwdName);
        case 'Contrasena':
          return Number(item.keyboardPwd);
        case 'Responsable':
          return item.senderUsername;
        case 'Fecha':
          return item.sendDate;
        case 'Periodo_validez':
          return item.endDate;
        case 'Valido':
          return item.displayStatus.text;
        default:
          return item[property];
      }
    };
  }
  async loadPasscodes() {
    this.isLoading = true;
    try {

      const response = await lastValueFrom(this.passcodeService.getPasscodesofLock(this.accessToken, this.lockId));
      console.log(response)
      this.passcodes = (response?.list ?? []).map(passcode => ({
        ...passcode,
        displayStatus: this.consultarEstado(passcode),
        displayDate: this.formatTimestamp(passcode.sendDate),
        displayPeriod: this.periodoValidez(passcode)
      }));
      this.dataSource.data = this.passcodes;
      console.log(this.passcodes);
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }
  async refresh() {
    await this.loadPasscodes();
  }
  searchPasscodes() {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }
  private consultarEstado(passcode: Passcode): { text: string; color: string } {
    if (passcode.keyboardPwdType === 1) {
      const expiracion = moment(passcode.startDate).add(6, 'hours');
      return moment().isAfter(expiracion) ? { text: 'Caducado', color: 'red' } : { text: 'Valido', color: 'green' };
    }
    if (passcode.keyboardPwdType === 3) {
      const ahora = moment();
      const inicio = moment(passcode.startDate);
      const fin = moment(passcode.endDate);
      if (ahora.isBefore(inicio) || ahora.isAfter(fin) || fin.isBefore(inicio)) {
        return { text: 'Inactivo', color: 'red' };
      }
      return { text: 'Valido', color: 'green' };
    }
    return { text: 'Valido', color: 'green' };
  }
  formatTimestamp(timestamp: string): string {
    return moment(timestamp).format('DD/MM/YYYY HH:mm');
  }
  periodoValidez(passcode: Passcode): string {
    switch (passcode.keyboardPwdType) {
      case 1:
        return `${moment(passcode.sendDate).format('DD/MM/YYYY HH:mm')} Una Vez`;
      case 2:
        return 'Permanente';
      case 3:
        return `${moment(passcode.startDate).format('DD/MM/YYYY HH:mm')} - ${moment(passcode.endDate).format('DD/MM/YYYY HH:mm')}`;
      case 4:
        return `${moment(passcode.sendDate).format('DD/MM/YYYY HH:mm')} Borrar`;
      case 5:
        return this.formatHorario(passcode, 'Fin de Semana');
      case 6:
        return this.formatHorario(passcode, 'Diaria');
      case 7:
        return this.formatHorario(passcode, 'Dia de Trabajo');
      case 8:
        return this.formatHorario(passcode, 'Lunes');
      case 9:
        return this.formatHorario(passcode, 'Martes');
      case 10:
        return this.formatHorario(passcode, 'Miercoles');
      case 11:
        return this.formatHorario(passcode, 'Jueves');
      case 12:
        return this.formatHorario(passcode, 'Viernes');
      case 13:
        return this.formatHorario(passcode, 'Sabado');
      default:
        return this.formatHorario(passcode, 'Domingo');
    }
  }
  private formatHorario(passcode: Passcode, nombre: string): string {
    const inicio = moment(passcode.startDate).format('HH:mm');
    const fin = moment(passcode.endDate).format('HH:mm');
    return `${inicio} - ${fin} ${nombre}`;
  }

  async crearPasscode(): Promise<void> {
    const { value } = await Swal.fire({
      title: 'Crear código',
      html: `
        <div class="vohk-swal-form">
          <div class="vohk-swal-field">
            <label for="passcodeName">Nombre</label>
            <input id="passcodeName" class="swal2-input" placeholder="Ej. Visita principal">
          </div>
          <div class="vohk-swal-grid">
            <div class="vohk-swal-field">
              <label for="passcodeMode">Generación</label>
              <select id="passcodeMode" class="swal2-select">
                <option value="random">Aleatorio</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <div class="vohk-swal-field">
              <label for="passcodeType">Vigencia</label>
              <select id="passcodeType" class="swal2-select">
                <option value="2">Permanente</option>
                <option value="3">Temporal</option>
              </select>
            </div>
          </div>
          <div id="passcodeCodeField" class="vohk-swal-field" style="display:none">
            <label for="passcodeValue">Código personalizado</label>
            <input id="passcodeValue" class="swal2-input" inputmode="numeric" placeholder="4 a 9 dígitos">
          </div>
          <div id="passcodeDates" class="vohk-swal-grid" style="display:none">
            <div class="vohk-swal-field">
              <label for="passcodeStart">Inicio</label>
              <input id="passcodeStart" type="datetime-local" class="swal2-input">
            </div>
            <div class="vohk-swal-field">
              <label for="passcodeEnd">Término</label>
              <input id="passcodeEnd" type="datetime-local" class="swal2-input">
            </div>
          </div>
          <p id="passcodeTimeHint" class="vohk-swal-hint" style="display:none"></p>
        </div>`,
      customClass: { popup: 'vohk-form-popup' },
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const mode = document.getElementById('passcodeMode') as HTMLSelectElement;
        const codeField = document.getElementById('passcodeCodeField') as HTMLDivElement;
        const type = document.getElementById('passcodeType') as HTMLSelectElement;
        const dates = document.getElementById('passcodeDates') as HTMLDivElement;
        const start = document.getElementById('passcodeStart') as HTMLInputElement;
        const end = document.getElementById('passcodeEnd') as HTMLInputElement;
        const timeHint = document.getElementById('passcodeTimeHint') as HTMLParagraphElement;
        const updateFields = () => {
          codeField.style.display = mode.value === 'custom' ? 'grid' : 'none';
          dates.style.display = type.value === '3' ? 'grid' : 'none';
          timeHint.style.display = type.value === '3' ? 'block' : 'none';
          timeHint.textContent = mode.value === 'random'
            ? 'TTLock aplica los códigos aleatorios por hora. Los minutos se guardarán como :00.'
            : 'El código personalizado conservará la hora y los minutos seleccionados.';
        };
        mode.addEventListener('change', updateFields);
        type.addEventListener('change', updateFields);
        this.openPickerOnFieldClick(start, end);
        updateFields();
      },
      preConfirm: () => {
        const name = (document.getElementById('passcodeName') as HTMLInputElement).value.trim();
        const mode = (document.getElementById('passcodeMode') as HTMLSelectElement).value;
        const code = (document.getElementById('passcodeValue') as HTMLInputElement).value.trim();
        const type = (document.getElementById('passcodeType') as HTMLSelectElement).value;
        const start = (document.getElementById('passcodeStart') as HTMLInputElement).value;
        const end = (document.getElementById('passcodeEnd') as HTMLInputElement).value;
        if (!name) {
          Swal.showValidationMessage('Debe ingresar un nombre.');
          return false;
        }
        if (mode === 'custom' && !/^\d{4,9}$/.test(code)) {
          Swal.showValidationMessage('El código debe contener entre 4 y 9 dígitos.');
          return false;
        }
        if (type === '3' && (!start || !end || moment(end).valueOf() <= moment(start).valueOf())) {
          Swal.showValidationMessage('Debe ingresar un período válido.');
          return false;
        }
        return { name, mode, code, type, start, end };
      }
    });
    if (!value) return;

    const precision = value.mode === 'random' ? 'hour' : 'minute';
    const startDate = value.type === '3'
      ? moment(value.start).startOf(precision).valueOf().toString()
      : moment().startOf(precision).valueOf().toString();
    const endDate = value.type === '3'
      ? moment(value.end).startOf(precision).valueOf().toString()
      : undefined;
    this.isLoading = true;
    try {
      const request = value.mode === 'custom'
        ? this.passcodeService.generateCustomPasscode(
          this.accessToken, this.lockId, value.code, value.type, value.name,
          value.type === '3' ? startDate : undefined, endDate
        )
        : this.passcodeService.generatePasscode(
          this.accessToken, this.lockId, value.type, startDate, value.name, endDate
        );
      const response = await lastValueFrom(request) as createPasscodeResponse;
      if (response?.keyboardPwdId || response?.errcode === 0) {
        await Swal.fire({
          icon: 'success',
          title: 'Código creado',
          text: response.keyboardPwd ? `Código: ${response.keyboardPwd}` : undefined,
          confirmButtonText: 'Aceptar'
        });
        await this.refresh();
      } else {
        this.showPasscodeError(response?.errcode, response?.errmsg, 'No fue posible crear el código.');
      }
    } catch (error) {
      console.error(error);
      this.showPasscodeError(undefined, undefined, 'Ocurrió un error inesperado al crear el código.');
    } finally {
      this.isLoading = false;
    }
  }

  async borrarPasscode(passcodeID: number): Promise<void> {
    const confirmation = await Swal.fire({
      title: 'Eliminar código',
      text: '¿Está seguro que desea eliminar este código?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      confirmButtonColor: '#d33'
    });
    if (!confirmation.isConfirmed) return;

    await this.runPasscodeChange(
      () => this.passcodeService.deletePasscode(this.accessToken, this.lockId, passcodeID),
      'Código eliminado',
      'No fue posible eliminar el código.'
    );
  }

  async cambiarNombrePasscode(passcode: Passcode): Promise<void> {
    const { value: name } = await Swal.fire({
      title: 'Editar nombre',
      input: 'text',
      inputValue: passcode.keyboardPwdName || '',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: value => value.trim() ? null : 'Debe ingresar un nombre.'
    });
    if (!name) return;

    await this.runPasscodeChange(
      () => this.passcodeService.changePasscode(this.accessToken, this.lockId, passcode.keyboardPwdId, name.trim()),
      'Nombre actualizado',
      'No fue posible cambiar el nombre.'
    );
  }

  async cambiarPeriodoPasscode(passcode: Passcode): Promise<void> {
    const startValue = Number(passcode.startDate) > 0 ? moment(Number(passcode.startDate)).format('YYYY-MM-DDTHH:mm') : '';
    const endValue = Number(passcode.endDate) > 0 ? moment(Number(passcode.endDate)).format('YYYY-MM-DDTHH:mm') : '';
    const { value } = await Swal.fire({
      title: 'Editar período',
      html: `
        <label style="display:block;text-align:left;margin:10px 2em 0">Inicio</label>
        <input id="passcodeStart" type="datetime-local" class="swal2-input" value="${startValue}">
        <label style="display:block;text-align:left;margin:10px 2em 0">Término</label>
        <input id="passcodeEnd" type="datetime-local" class="swal2-input" value="${endValue}">`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        this.openPickerOnFieldClick(
          document.getElementById('passcodeStart') as HTMLInputElement,
          document.getElementById('passcodeEnd') as HTMLInputElement
        );
      },
      preConfirm: () => {
        const start = (document.getElementById('passcodeStart') as HTMLInputElement).value;
        const end = (document.getElementById('passcodeEnd') as HTMLInputElement).value;
        if (!start || !end || moment(end).valueOf() <= moment(start).valueOf()) {
          Swal.showValidationMessage('Debe ingresar un período válido.');
          return false;
        }
        return { start, end };
      }
    });
    if (!value) return;

    await this.runPasscodeChange(
      () => this.passcodeService.changePasscode(
        this.accessToken, this.lockId, passcode.keyboardPwdId, undefined, undefined,
        moment(value.start).valueOf().toString(), moment(value.end).valueOf().toString()
      ),
      'Período actualizado',
      'No fue posible cambiar el período.'
    );
  }

  async cambiarPasscode(passcode: Passcode): Promise<void> {
    const { value: code } = await Swal.fire({
      title: 'Editar secuencia',
      input: 'text',
      inputValue: passcode.keyboardPwd || '',
      inputAttributes: { inputmode: 'numeric', maxlength: '9' },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: value => /^\d{4,9}$/.test(value.trim()) ? null : 'El código debe contener entre 4 y 9 dígitos.'
    });
    if (!code) return;

    await this.runPasscodeChange(
      () => this.passcodeService.changePasscode(this.accessToken, this.lockId, passcode.keyboardPwdId, undefined, code.trim()),
      'Código actualizado',
      'No fue posible cambiar la secuencia.'
    );
  }

  private async runPasscodeChange(request: () => any, successTitle: string, fallbackError: string): Promise<void> {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(request()) as operationResponse;
      if (response?.errcode === 0) {
        await Swal.fire({ icon: 'success', title: successTitle, timer: 1500, showConfirmButton: false });
        await this.refresh();
      } else {
        this.showPasscodeError(response?.errcode, response?.errmsg, fallbackError);
      }
    } catch (error) {
      console.error(error);
      this.showPasscodeError(undefined, undefined, fallbackError);
    } finally {
      this.isLoading = false;
    }
  }

  private showPasscodeError(errcode: number | undefined, errmsg: string | undefined, fallback: string): void {
    if (errcode === 10003) {
      sessionStorage.clear();
    }
    const messages: { [key: number]: string } = {
      [-3008]: 'Para editar este código necesita usarlo al menos una vez.',
      [-3007]: 'El código ya existe en la cerradura.',
      [-3006]: 'El código debe contener entre 4 y 9 dígitos.',
      [-3003]: 'El gateway está ocupado. Intente nuevamente en unos segundos.'
    };
    Swal.fire({ icon: 'error', title: 'Error', text: messages[errcode ?? 0] || errmsg || fallback });
  }

  private openPickerOnFieldClick(...inputs: HTMLInputElement[]): void {
    inputs.forEach(input => {
      input.addEventListener('click', () => {
        try {
          input.showPicker();
        } catch {
          input.focus();
        }
      });
    });
  }

  toMultiples() {
    this.passcodeService.userID = sessionStorage.getItem('user') ?? '';
    this.passcodeService.lockID = this.lockId;
    this.passcodeService.currentLocks = this.locksOfGroup;
    this.passcodeService.selectedLocks = this.locksOfGroup.map(lock => ({
      id: lock.lockId,
      alias: lock.lockAlias
    }));
    this.popupService.locksOfGroup = this.locksOfGroup;
    this.router.navigate(['users', this.passcodeService.userID, 'lock', this.lockId, 'passcode', 'multiple']);
  }
}
