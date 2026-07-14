import { Component, Input, OnInit, ViewChild, AfterViewInit, SimpleChanges } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import moment from 'moment';
import Swal from 'sweetalert2';
import { lastValueFrom } from 'rxjs';
import { Ekey } from 'src/app/Interfaces/Elements';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { operationResponse } from 'src/app/Interfaces/API_responses';
import { LockData } from 'src/app/Interfaces/Lock';
import { CreateEkeyForm } from 'src/app/Interfaces/CreateEkeyForm';
import { UserServiceService } from 'src/app/services/user-service.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ekey-table',
  templateUrl: './ekey-table.component.html',
  styleUrls: ['./ekey-table.component.css']
})
export class EkeyTableComponent implements OnInit, AfterViewInit {

  @Input() lockId!: number;
  @Input() accessToken!: string;
  @Input() locksOfGroup: LockData[] = [];
  ekeys: Ekey[] = [];
  displayedColumns = ['Nombre', 'Destinatario', 'Rol', 'Fecha', 'Periodo_validez', 'Valido', 'Botones'];
  searchText = '';
  dataSource = new MatTableDataSource<Ekey>();
  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;
  isLoading: boolean = false;

  constructor(public ekeyService: EkeyServiceService, public lockService: LockServiceService, private userService: UserServiceService, private router: Router) { }

  async ngOnInit() {
    await this.loadEkeys();
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'Nombre':
          return item.keyName?.toLowerCase();
        case 'Destinatario':
          return item.username?.toLowerCase();
        case 'Rol':
          return item.keyRight;
        case 'Fecha':
          return item.date;
        case 'Periodo_validez':
          return item.endDate ?? item.startDate ?? 0;
        case 'Valido':
          const status = item.displayStatus?.text;
          return status === 'Válido' ? 2 :
            status === 'Pendiente' ? 1 :
              status === 'Congelada' ? 0 : -1;
        default:
          return item[property];
      }
    };
  }
  async loadEkeys() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.ekeyService.getEkeysofLock(this.accessToken, this.lockId));
      this.ekeys = (response?.list ?? []).map(ekey => ({
        ...ekey,
        displayStatus: this.buildStatus(ekey)
      }));
      this.dataSource.data = this.ekeys;
      console.log(this.ekeys)
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }
  async refresh() {
    await this.loadEkeys();
  }
  searchEkeys() {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }
  private buildStatus(ekey: Ekey): { text: string; color: string } {
    if (ekey.keyStatus === '110402') {
      return { text: 'Pendiente', color: 'gray' };
    }
    if (ekey.keyStatus === '110405') {
      return { text: 'Congelada', color: 'blue' };
    }
    if (!ekey.endDay) {
      if (Number(ekey.endDate) === 0) {
        return { text: 'Válido', color: 'green' };
      }
      if (Number(ekey.endDate) === 1) {
        return moment(ekey.startDate).add(1, 'hour').isAfter(moment()) ? { text: 'Válido', color: 'green' } : { text: 'Inválido', color: 'red' };
      }
      return this.timestampStatus(Number(ekey.endDate));
    }
    const fecha = moment(ekey.endDay).format('YYYY-MM-DD');
    const hora = moment(ekey.endDate).format('HH:mm');
    return this.timestampStatus(moment(`${fecha} ${hora}`).valueOf());
  }
  private timestampStatus(timestamp: number): { text: string; color: string } {
    if (moment(timestamp).isAfter(moment())) {
      return { text: 'Válido', color: 'green' };
    }
    return { text: 'Inválido', color: 'red' };
  }
  formatTimestamp(timestamp: number): string {
    return moment(timestamp).format('DD/MM/YYYY HH:mm');
  }
  periodoValidezEkey(ekey: Ekey): string {
    if (Number(ekey.endDate) === 1) {
      return `${moment(ekey.startDate).format('DD/MM/YYYY HH:mm')} Una vez`;
    }
    if (Number(ekey.startDate) === 0 && Number(ekey.endDate) === 0) {
      return 'Permanente';
    }
    if (ekey.keyType === 4) {
      const dayNames = ['Sabado', 'Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
      const HoraInicio = moment(ekey.startDate).format('HH:mm');
      const HoraFinal = moment(ekey.endDate).format('HH:mm');
      const DiaInicio = moment(ekey.startDay).format('DD/MM/YYYY');
      const DiaFinal = moment(ekey.endDay).format('DD/MM/YYYY');
      const selectedDays = JSON.parse(ekey.weekDays);
      const formattedSelectedDays = selectedDays.map((day: number) => dayNames[day]).join(', ');
      return `${DiaInicio} - ${DiaFinal}, ${formattedSelectedDays}, ${HoraInicio} ~ ${HoraFinal}`;
    }
    return this.periodoValidez(Number(ekey.startDate), Number(ekey.endDate));
  }
  private periodoValidez(start: number, end: number): string {
    return `${moment(start).format('DD/MM/YYYY HH:mm')} - ${moment(end).format('DD/MM/YYYY HH:mm')}`;
  }
  async crearEkey(): Promise<void> {
    const selectedLocks = new Map<number, string>();
    const currentLock = this.locksOfGroup.find(l => l.lockId === this.lockId);
    if (currentLock) {
      selectedLocks.set(currentLock.lockId, currentLock.lockAlias);
    }
    const { value: form } = await Swal.fire<CreateEkeyForm>({
      title: 'Crear eKey',
      width: 850,
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'ekey-popup'
      },
      html: this.buildCreateEkeyHtml(selectedLocks),
      didOpen: () => {
        this.initializeCreateEkeyEvents(selectedLocks);
      },
      preConfirm: () => {
        return this.validateCreateEkey(selectedLocks);
      }
    });
    if (!form) {
      return;
    }
    await this.sendEkeys(form);
  }
  private buildCreateEkeyHtml(selectedLocks: Map<number, string>): string {
    return `
    <input id="receiver" class="swal2-input" placeholder="Email o celular">
    <input id="name" class="swal2-input" placeholder="Nombre de la eKey">
    <select id="type" class="swal2-input">
      <option value="1"> Permanente </option>
      <option value="2"> Temporal </option>
    </select>
    <div id="dateBlock" style="display:none">
      <label style="display:block;text-align:left;margin-top:10px;">
        Inicio
      </label>
      <div style="display:flex;gap:10px;">
        <input id="startDate" type="date" class="swal2-input" style="margin:0;flex:1;">
        <input id="startTime" type="time" class="swal2-input" value="00:00" style="margin:0;width:140px;">
      </div>
      <label style="display:block;text-align:left;margin-top:15px;">
        Término
      </label>
      <div style="display:flex;gap:10px;">
        <input id="endDate" type="date" class="swal2-input" style="margin:0;flex:1;">
        <input id="endTime" type="time" class="swal2-input" value="23:59" style="margin:0;width:140px;">
      </div>
    </div>
    <button id="toggleLocks" type="button" class="swal2-styled" style="margin-top:10px">
      Seleccionar cerraduras ▼
    </button>
    <div id="locksContainer" style="display:none;margin-top:15px;max-height:220px;overflow:auto;border:1px solid #ddd;border-radius:6px;padding:10px;text-align:left;">
      ${this.locksOfGroup.map(lock => `
        <label style="display:flex;gap:8px;margin-bottom:8px;">
          <input type="checkbox" class="lockChk" data-id="${lock.lockId}" ${lock.lockId === this.lockId ? "checked" : ""}>
          ${lock.lockAlias}
        </label>
      `).join("")}
    </div>
    <hr>
    <label style="display:flex;gap:8px;align-items:center;margin-top:10px;">
      <input id="notifyEmail" type="checkbox">
      Enviar notificación por email
    </label>
    <input id="notificationEmail" class="swal2-input" placeholder="Correo de notificación" style="display:none">
    <label style="display:flex;gap:8px;align-items:center;margin-top:15px;">
      <input id="remoteEnable" type="checkbox" checked>
      Apertura remota
    </label>
    <label style="display:flex;gap:8px;align-items:center;margin-top:10px;">
      <input id="keyRight" type="checkbox">
      Administrador autorizado
    </label>
    `;
  }
  private initializeCreateEkeyEvents(selectedLocks: Map<number, string>): void {
    const typeEl = document.getElementById('type') as HTMLSelectElement;
    const dateBlock = document.getElementById('dateBlock') as HTMLDivElement;
    const receiverInput = document.getElementById('receiver') as HTMLInputElement;
    const notifyCheckbox = document.getElementById('notifyEmail') as HTMLInputElement;
    const notificationEmail = document.getElementById('notificationEmail') as HTMLInputElement;
    const toggleLocks = document.getElementById('toggleLocks') as HTMLButtonElement;
    const locksContainer = document.getElementById('locksContainer') as HTMLDivElement;
    const updateDates = () => {
      dateBlock.style.display = typeEl.value === '2' ? 'block' : 'none';
    };
    updateDates();
    typeEl.addEventListener('change', updateDates);
    const updateNotificationEmail = () => {
      if (!notifyCheckbox.checked) {
        notificationEmail.style.display = 'none';
        notificationEmail.value = '';
        return;
      }
      const receiver = receiverInput.value.trim();
      if (this.userService.isValidEmail(receiver)) {
        notificationEmail.style.display = 'none';
        notificationEmail.value = '';
      } else {
        notificationEmail.style.display = 'block';
      }
    };
    notifyCheckbox.addEventListener('change', updateNotificationEmail);
    receiverInput.addEventListener('input', updateNotificationEmail);
    updateNotificationEmail();
    toggleLocks.addEventListener('click', () => {
      const hidden = locksContainer.style.display === 'none';
      locksContainer.style.display = hidden ? 'block' : 'none';
      toggleLocks.innerHTML = hidden ? 'Ocultar cerraduras ▲' : 'Seleccionar cerraduras ▼';
    });
    const printLocks = () => {
      console.log('Selected Locks');
      console.table(
        [...selectedLocks].map(([lockId, lockAlias]) => ({ lockId, lockAlias }))
      );
    };
    printLocks();
    document.querySelectorAll('.lockChk').forEach(element => {
      element.addEventListener('change', event => {
        const checkbox = event.target as HTMLInputElement;
        const lockId = Number(checkbox.dataset['id']);
        const lock = this.locksOfGroup.find(l => l.lockId === lockId);
        if (!lock) { return; }
        if (checkbox.checked) {
          selectedLocks.set(lock.lockId, lock.lockAlias);
        } else {
          selectedLocks.delete(lock.lockId);
        }
        printLocks();
      }
      );
    });
  }
  private validateCreateEkey(selectedLocks: Map<number, string>): CreateEkeyForm | false {
    const receiver = (document.getElementById("receiver") as HTMLInputElement).value.trim();
    const name = (document.getElementById("name") as HTMLInputElement).value.trim();
    const type = (document.getElementById("type") as HTMLSelectElement).value;
    const startDate = (document.getElementById("startDate") as HTMLInputElement).value;
    const startTime = (document.getElementById("startTime") as HTMLInputElement).value;
    const endDate = (document.getElementById("endDate") as HTMLInputElement).value;
    const endTime = (document.getElementById("endTime") as HTMLInputElement).value;
    const remoteEnable = (document.getElementById("remoteEnable") as HTMLInputElement).checked;
    const keyRight = (document.getElementById("keyRight") as HTMLInputElement).checked;
    const notifyEmail = (document.getElementById("notifyEmail") as HTMLInputElement).checked;
    const notificationEmail = (document.getElementById("notificationEmail") as HTMLInputElement).value.trim();
    if (!receiver) {
      Swal.showValidationMessage("Debe ingresar un destinatario.");
      return false;
    }
    if (!this.userService.isValidEmail(receiver) && !this.userService.isValidPhone(receiver).isValid) {
      Swal.showValidationMessage("El destinatario debe ser un email o un teléfono válido.");
      return false;
    }
    if (!name) {
      Swal.showValidationMessage("Debe ingresar un nombre para la eKey.");
      return false;
    }
    if (selectedLocks.size === 0) {
      Swal.showValidationMessage("Debe seleccionar al menos una cerradura.");
      return false;
    }
    if (type === "2") {
      if (!startDate || !startTime || !endDate || !endTime) {
        Swal.showValidationMessage("Debe seleccionar fecha y hora.");
        return false;
      }
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      if (end <= start) {
        Swal.showValidationMessage("La fecha final debe ser mayor.");
        return false;
      }
    }
    if (notifyEmail) {
      if (!this.userService.isValidEmail(receiver)) {
        if (!notificationEmail) {
          Swal.showValidationMessage("Debe ingresar el correo para la notificación.");
          return false;
        }
        if (!this.userService.isValidEmail(notificationEmail)) {
          Swal.showValidationMessage("Correo de notificación inválido.");
          return false;
        }
      }
    }
    return {
      receiver, name, type, startDate, startTime, endDate, endTime, remoteEnable, keyRight, notifyEmail, notificationEmail,
      locks: [...selectedLocks].map(([lockId, lockAlias]) => ({ lockId, lockAlias }))
    };
  }
  private async sendEkeys(form: CreateEkeyForm): Promise<void> {
    this.isLoading = true;
    try {
      const receiver = this.userService.isValidPhone(form.receiver).isValid ? this.userService.normalizePhone(form.receiver) : form.receiver;
      const isPermanent = form.type === "1";
      let startMs = "0";
      let endMs = "0";
      if (!isPermanent) {
        startMs = moment(`${form.startDate} ${form.startTime}`, "YYYY-MM-DD HH:mm").valueOf().toString();
        endMs = moment(`${form.endDate} ${form.endTime}`, "YYYY-MM-DD HH:mm").valueOf().toString();
      }
      let email = "";
      if (form.notifyEmail) {
        email = this.userService.isValidEmail(receiver) ? receiver : form.notificationEmail;
      }
      const response: any = await lastValueFrom(this.ekeyService.sendMany(this.accessToken, form.locks, receiver, form.name, startMs, endMs, form.keyRight ? 1 : 0, form.remoteEnable ? 1 : 2, form.notifyEmail, email));
      console.log(response);
      if (response?.errcode === -2019) {
        await Swal.fire({ icon: "error", title: "Error", text: "No puedes enviarte una eKey a ti mismo." });
        return;
      }
      if (!response?.success) {
        await Swal.fire({ icon: "error", title: "Error", text: "No fue posible crear las eKeys." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Éxito", text: form.locks.length === 1 ? "La eKey fue creada correctamente." : `Se crearon ${form.locks.length} eKeys correctamente.` });
      await this.refresh();
    } catch (error) {
      console.error(error);
      await Swal.fire({ icon: "error", title: "Error", text: "Ocurrió un error inesperado al crear las eKeys." });
    } finally {
      this.isLoading = false;
    }
  }
  async borrarEkey(ekeyID: number) {
    const result = await Swal.fire({
      title: 'Eliminar eKey',
      text: '¿Está seguro que desea eliminar esta eKey?',
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
      const response = await lastValueFrom(this.ekeyService.deleteEkey(this.accessToken, ekeyID)) as operationResponse;
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'eKey eliminada', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible eliminar la eKey.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async Autorizar(ekeyID: number, username: string) {
    const result = await Swal.fire({
      title: 'Autorizar eKey',
      text: `¿Desea autorizar a ${username}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
    });
    if (!result.isConfirmed) {
      return;
    }
    try {
      const response = await lastValueFrom(this.ekeyService.AuthorizeEkey(this.accessToken, this.lockId, ekeyID)) as operationResponse;
      if (response.errcode === 0) {
        Swal.fire({ icon: 'success', title: 'eKey autorizada', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible autorizar la eKey.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async Desautorizar(ekeyID: number, username: string) {
    const result = await Swal.fire({
      title: 'Desautorizar eKey',
      text: `¿Desea desautorizar a ${username}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
    });
    if (!result.isConfirmed) {
      return;
    }
    try {
      const response = await lastValueFrom(this.ekeyService.cancelAuthorizeEkey(this.accessToken, this.lockId, ekeyID)) as operationResponse;
      if (response.errcode === 0) {
        Swal.fire({ icon: 'success', title: 'eKey desautorizada', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible desautorizar la eKey.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async congelar(ekeyID: number, user: string) {
    const result = await Swal.fire({
      title: 'Congelar eKey',
      text: `¿Está seguro que desea congelar a ${user}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
    });
    if (!result.isConfirmed) {
      return;
    }
    try {
      const response = await lastValueFrom(this.ekeyService.freezeEkey(this.accessToken, ekeyID)) as operationResponse;
      if (response.errcode === 0) {
        Swal.fire({ icon: 'success', title: 'eKey congelada', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'La acción congelar no pudo ser completada.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async descongelar(ekeyID: number, user: string) {
    const result = await Swal.fire({
      title: 'Descongelar eKey',
      text: `¿Está seguro que desea descongelar a ${user}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
    });
    if (!result.isConfirmed) {
      return;
    }
    try {
      const response = await lastValueFrom(this.ekeyService.unfreezeEkey(this.accessToken, ekeyID)) as operationResponse;
      if (response.errcode === 0) {
        Swal.fire({ icon: 'success', title: 'eKey descongelada', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'La acción descongelar no pudo ser completada.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async cambiarNombreEkey(ekeyID: number) {
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
      const response = await lastValueFrom(this.ekeyService.modifyEkey(this.accessToken, ekeyID, name)) as operationResponse;
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'Nombre actualizado', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else if (response.errcode === -3) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'El nombre ingresado es muy largo.', });
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible cambiar el nombre.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async cambiarPeriodoEkey(ekeyID: number) {
    const { value } = await Swal.fire({
      title: 'Cambiar período de eKey',
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
      const response = await lastValueFrom(this.ekeyService.changePeriod(this.accessToken, ekeyID, startDate, endDate)) as operationResponse;
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
  toMultiples() {
    this.ekeyService.locksOfGroup = this.locksOfGroup;
    let url = "/lock/".concat(this.lockId.toString()) + "/ekey/multiple"
    this.router.navigate([url]);
  }
}