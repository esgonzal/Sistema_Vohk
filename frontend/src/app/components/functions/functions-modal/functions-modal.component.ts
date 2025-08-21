import { Component } from '@angular/core';
import { DarkModeService } from 'src/app/services/dark-mode.service';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { GatewayService } from 'src/app/services/gateway.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-functions-modal',
  templateUrl: './functions-modal.component.html',
  styleUrls: ['./functions-modal.component.css']
})
export class FunctionsModalComponent {
  isLoading: boolean = false;
  selectedLocks: { id: number, alias: string }[] = [];
  error = '';
  name: string;

  constructor(
    public popupService: PopUpService,
    public DarkModeService: DarkModeService,
    private ekeyService: EkeyServiceService,
    public lockService: LockServiceService,
    public gatewayService: GatewayService
  ) { }

  isLockSelected(lockId: number): boolean {
    return this.ekeyService.selectedLocks.some(lock => lock.id === lockId);
  }
  toggleLockSelection(lockId: number, lockAlias: string) {
    const index = this.selectedLocks.findIndex(lock => lock.id === lockId);
    if (index !== -1) {
      // If lock ID is already in the array, remove it
      this.selectedLocks.splice(index, 1);
    } else {
      // If lock ID is not in the array, add it with the alias
      this.selectedLocks.push({ id: lockId, alias: lockAlias });
    }
    this.lockService.locksForTransfer = this.selectedLocks;
    console.log("selectedLocks: ", this.selectedLocks);
  }
  confirmLockSelection() {
    this.ekeyService.selectedLocks = this.selectedLocks;
  }
  toggleHubSelection(hubId: number) {
    const index = this.gatewayService.selectedHubs.findIndex(hub => hub.id === hubId);
    if (index !== -1) {
      // If lock ID is already in the array, remove it
      this.gatewayService.selectedHubs.splice(index, 1);
    } else {
      // If lock ID is not in the array, add it with the alias
      this.gatewayService.selectedHubs.push({ id: hubId });
    }
    console.log("selectedHubs: ", this.gatewayService.selectedHubs);
  }
  isHubSelected(hubId: number): boolean {
    return this.gatewayService.selectedHubs.some(hub => hub.id === hubId);
  }
  exportToExcel(): void {
    if (this.name !== undefined) {
      const cleanedRecords = this.popupService.records.map(record => ({
        Operador: record.username,
        Metodo_Apertura: this.lockService.consultarMetodo(record.recordTypeFromLock, record.username),
        Horario_Apertura: this.lockService.formatTimestamp(record.lockDate),
        Estado: this.lockService.consultarSuccess(record.success),
      }));
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(cleanedRecords);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, this.name.concat('.xlsx'));
      this.popupService.excelNameWindow = false;
    } else {
      this.error = "Por favor ingrese un nombre"
    }
  }

}
