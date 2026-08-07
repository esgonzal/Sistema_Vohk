import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { lastValueFrom } from 'rxjs';
import { PopUpService } from 'src/app/services/pop-up.service';
import { DarkModeService } from 'src/app/services/dark-mode.service';
import { CardServiceService } from 'src/app/services/card-service.service';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { CardResult } from 'src/app/Interfaces/API_responses';
import { SelectedLock } from 'src/app/Interfaces/SelectedLock';
import { LockData } from 'src/app/Interfaces/Lock';

interface MultipleCard {
  name: string;
  tipo: number;
  number: string;
}

@Component({
  selector: 'app-multiple-cards',
  templateUrl: './multiple-cards.component.html',
  styleUrls: ['./multiple-cards.component.css']
})
export class MultipleCardsComponent implements OnInit {

  accessToken = sessionStorage.getItem('accessToken') ?? '';
  lockId = Number(sessionStorage.getItem('lockID') ?? '');
  isLoading = false;
  showLocks = false;
  cards: MultipleCard[] = [{ name: '', tipo: 1, number: '' }];
  selectedLocks: SelectedLock[] = [];
  locksOfGroup: LockData[] = [];

  constructor(
    private router: Router,
    public popupService: PopUpService,
    public DarkModeService: DarkModeService,
    private cardService: CardServiceService) { }

  ngOnInit(): void {
    this.locksOfGroup = this.cardService.locksOfGroup ?? [];

    const currentLock = this.locksOfGroup.find(lock => lock.lockId === this.cardService.lockID);
    if (currentLock) {
      this.selectedLocks.push({ lockId: currentLock.lockId, lockAlias: currentLock.lockAlias });
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

  addCard(): void {
    this.cards.push({ name: '', tipo: 1, number: '' });
  }

  removeCard(index: number): void {
    this.cards.splice(index, 1);

    if (this.cards.length === 0) {
      this.addCard();
    }
  }

  private validate(): boolean {
    if (this.selectedLocks.length === 0) {
      Swal.fire('Error', 'Debe seleccionar al menos una cerradura.', 'error');
      return false;
    }

    for (const card of this.cards) {
      if (!card.name.trim()) {
        Swal.fire('Error', 'Todas las tarjetas deben tener un nombre.', 'error');
        return false;
      }

      if (!card.number.toString().trim()) {
        Swal.fire('Error', 'Todas las tarjetas deben tener un número.', 'error');
        return false;
      }
    }

    return true;
  }

  async generate(): Promise<void> {
    if (!this.validate()) return;
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.cardService.multipleCards(this.accessToken, this.selectedLocks, this.cards)) as CardResult[];
      this.popupService.multipleCardResults = response;
      this.popupService.multipleCardsResult = true;
    } catch (error) {
      console.error(error);
      await Swal.fire('Error', 'Ocurrió un error al generar las tarjetas.', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  downloadExcelTemplate(): void {
    const data = [['NOMBRE', 'NUMERO'], ['', '']];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
    XLSX.writeFile(workbook, 'Plantilla_Tarjetas.xlsx');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      this.processExcelData(rows);
      input.value = '';
    };

    reader.readAsArrayBuffer(input.files[0]);
  }

  private processExcelData(data: any[]): void {
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (!row || row.length < 2) continue;

      const name = String(row[0] ?? '').trim();
      const number = String(row[1] ?? '').trim();

      if (!name && !number) continue;

      this.cards.push({ name, tipo: 1, number });
    }
  }
}