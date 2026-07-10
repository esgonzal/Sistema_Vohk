import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { lastValueFrom } from 'rxjs';
import { EkeyServiceService } from '../../../services/ekey-service.service';
import { UserServiceService } from '../../../services/user-service.service';
import { DarkModeService } from 'src/app/services/dark-mode.service';
import { MultipleEkeyForm } from 'src/app/Interfaces/MultipleEkeyForm';
import { MultipleReceiver } from 'src/app/Interfaces/MultipleReceiver';
import { SelectedLock } from 'src/app/Interfaces/SelectedLock';
import { LockData } from 'src/app/Interfaces/Lock';


@Component({
  selector: 'app-multiple-ekey',
  templateUrl: './multiple-ekey.component.html',
  styleUrls: ['./multiple-ekey.component.css']
})
export class MultipleEkeyComponent implements OnInit {

  accessToken = sessionStorage.getItem('accessToken') ?? '';
  lockId = Number(sessionStorage.getItem('lockID') ?? '');
  isLoading = false;
  showLocks = false;
  form: MultipleEkeyForm = { type: '1', startDate: '', endDate: '', remoteEnable: true, keyRight: false, notifyEmail: false };
  receivers: MultipleReceiver[] = [{ department: '', receiver: '', receiverName: '', keyName: '', notificationEmail: '' }];
  selectedLocks: SelectedLock[] = [];
  locksOfGroup: LockData[] = [];

  constructor(
    private router: Router,
    public ekeyService: EkeyServiceService,
    public userService: UserServiceService,
    public DarkModeService: DarkModeService
  ) { }

  ngOnInit(): void {
    this.locksOfGroup = this.ekeyService.locksOfGroup ?? [];
    const currentLock = this.locksOfGroup.find(lock => lock.lockId === this.lockId);
    if (currentLock) {
      this.selectedLocks.push({ lockId: currentLock.lockId, lockAlias: currentLock.lockAlias });
    }
  }
  addRecipient(): void {
    this.receivers.push({ department: '', receiver: '', receiverName: '', keyName: '', notificationEmail: '' });
  }
  removeRecipient(index: number): void {
    this.receivers.splice(index, 1);
    if (this.receivers.length === 0) {
      this.addRecipient();
    }
  }
  toggleLocks(): void {
    this.showLocks = !this.showLocks;
  }
  isLockSelected(lockId: number): boolean {
    return this.selectedLocks.some(lock => lock.lockId === lockId);
  }
  toggleLock(lock: LockData, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.isLockSelected(lock.lockId)) {
        this.selectedLocks.push({ lockId: lock.lockId, lockAlias: lock.lockAlias });
      }
    } else {
      this.selectedLocks = this.selectedLocks.filter(selected => selected.lockId !== lock.lockId);
    }
  }
  private validate(): boolean {
    if (this.selectedLocks.length === 0) {
      Swal.fire("Error", "Debe seleccionar al menos una cerradura.", "error");
      return false;
    }
    if (this.form.type === '2') {
      if (!this.form.startDate || !this.form.endDate) {
        Swal.fire("Error", "Debe seleccionar ambas fechas.", "error");
        return false;
      }
      if (new Date(this.form.endDate) <= new Date(this.form.startDate)) {
        Swal.fire("Error", "La fecha final debe ser mayor.", "error");
        return false;
      }
    }
    for (const receiver of this.receivers) {
      if (!receiver.receiver.trim()) {
        Swal.fire("Error", "Todos los destinatarios deben tener una cuenta.", "error");
        return false;
      }
      if (!this.userService.isValidEmail(receiver.receiver) && !this.userService.isValidPhone(receiver.receiver).isValid) {
        Swal.fire("Error", "Hay destinatarios inválidos.", "error");
        return false;
      }
      if (!receiver.keyName.trim()) {
        Swal.fire("Error", "Todos los destinatarios deben tener nombre de eKey.", "error");
        return false;
      }
      if (this.form.notifyEmail) {
        if (!this.userService.isValidEmail(receiver.receiver)) {
          if (!receiver.notificationEmail) {
            Swal.fire("Error", "Debe ingresar un correo de notificación.", "error");
            return false;
          }
          if (!this.userService.isValidEmail(receiver.notificationEmail)) {
            Swal.fire("Error", "Hay correos de notificación inválidos.", "error");
            return false;
          }
        }
      }
    }
    return true;
  }
  async generate(): Promise<void> {
    if (!this.validate()) {
      return;
    }
    this.isLoading = true;
    try {
      let startMs = "0";
      let endMs = "0";
      if (this.form.type === "2") {
        startMs = moment(this.form.startDate).startOf("day").add(1, "minute").valueOf().toString();
        endMs = moment(this.form.endDate).endOf("day").valueOf().toString();
      }
      const normalizedReceivers = this.receivers.map(receiver => ({
        department: receiver.department,
        receiver: this.userService.isValidPhone(receiver.receiver).isValid ? this.userService.normalizePhone(receiver.receiver) : receiver.receiver,
        receiverName: receiver.receiverName,
        keyName: receiver.keyName,
        notificationEmail: this.userService.isValidEmail(receiver.receiver) ? receiver.receiver : receiver.notificationEmail
      }));
      const response: any = await lastValueFrom(this.ekeyService.sendMultiple(this.accessToken, this.selectedLocks, normalizedReceivers, startMs, endMs, this.form.keyRight ? 1 : 0, this.form.remoteEnable ? 1 : 2, this.form.notifyEmail));
      console.log(response)
      if (!response.success) {
        await Swal.fire("Error", "No fue posible generar las eKeys.", "error");
        return;
      }
      await Swal.fire("Éxito", `${response.createdCount ?? 0} eKeys creadas correctamente.`, "success");
      this.isLoading = false;
      this.router.navigate([`/lock/${this.lockId}`]);
    } catch (error) {
      console.error(error);
      await Swal.fire("Error", "Ocurrió un error inesperado.", "error");
    } finally {
      this.isLoading = false;
    }
  }
  downloadExcelTemplate(): void {
    const data = [["", "N° DEPTO", "NOMBRE", "TELEFONO", "EMAIL"]];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
    XLSX.writeFile(workbook, "Plantilla.xlsx");
  }
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      this.processExcelData(rows);
    };
    reader.readAsArrayBuffer(input.files[0]);
  }
  private processExcelData(data: any[]): void {
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 4) {
        continue;
      }
      this.receivers.push({
        department: String(row[1] ?? ''),
        receiver: String(row[3] ?? '').replace(/\s/g, ''),
        receiverName: String(row[2] ?? ''),
        keyName: `${row[2] ?? ''} - ${row[1] ?? ''}`,
        notificationEmail: String(row[4] ?? '')
      });
    }
  }
}