import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { MultiplePasscodeResponse } from 'src/app/Interfaces/API_responses';
import { DarkModeService } from 'src/app/services/dark-mode.service';
import { PasscodeServiceService } from 'src/app/services/passcode-service.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-multiple-passcode',
  templateUrl: './multiple-passcode.component.html',
  styleUrls: ['./multiple-passcode.component.css']
})
export class MultiplePasscodeComponent implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef;

  isLoading: boolean = false;
  error = "";
  passcodes: { name: string, tipo: number, code: string }[];

  constructor(
    private router: Router,
    private passcodeService: PasscodeServiceService,
    private ekeyService: EkeyServiceService,
    public popupService: PopUpService,
    public DarkModeService: DarkModeService) {
    if (!this.passcodeService.userID || !this.passcodeService.lockID) {
      this.router.navigate(['users', sessionStorage.getItem('user'), 'lock', sessionStorage.getItem('lockID')])
    }
  }

  async ngOnInit() {
    this.popupService.locksOfGroup = this.passcodeService.currentLocks;
    await this.loadPasscodesFromEkeys();
  }

  private async loadPasscodesFromEkeys() {
    this.isLoading = true;
    try {
      const accessToken = sessionStorage.getItem('accessToken') ?? '';
      const response = await lastValueFrom(
        this.ekeyService.getEkeysofLock(accessToken, this.passcodeService.lockID)
      );

      this.passcodes = (response?.list ?? []).map(ekey => ({
        name: ekey.keyName,
        tipo: 2,
        code: this.lastSixDigits(ekey.username)
      }));

      if (this.passcodes.length === 0) {
        this.passcodes = [{ name: '', tipo: 2, code: '' }];
        this.error = 'No se encontraron eKeys para generar códigos.';
      }
    } catch (error) {
      console.error('Error while loading eKeys for passcodes:', error);
      this.passcodes = [{ name: '', tipo: 2, code: '' }];
      this.error = 'No fue posible cargar las eKeys.';
    } finally {
      this.isLoading = false;
    }
  }

  private lastSixDigits(username: string): string {
    return (username ?? '').replace(/\D/g, '').slice(-6);
  }

  removePasscode(index: number) {
    this.passcodes.splice(index, 1);
  }
  addPasscode() {
    const newPasscode = {
      name: '',
      tipo: 2,
      code: '',
    };
    this.passcodes.push(newPasscode);
  }

  downloadExcelTemplate(): void {
    // Crear un libro de trabajo
    const workbook = XLSX.utils.book_new();

    // Estilo para los encabezados (si quisieras poner algún encabezado)
    const headerStyle = {
      fill: { fgColor: { rgb: "FFDDDDDD" } },
      font: { bold: true },
      alignment: { horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };

    // Crear datos de la hoja
    const worksheetData = [
      [], // Fila 1 vacía
      [], // Fila 2 vacía
      ["", "N° DEPTO / Nombre", "Código", ""], // Fila 3: encabezados visibles (opcional)
      ["", "Nombre", "8520", ""], // Fila 4: ejemplo de fila vacía para que el usuario complete
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Aplicar estilo a encabezados (opcional)
    const headerCells = ["B3", "C3"];
    headerCells.forEach(cell => {
      worksheet[cell].s = headerStyle;
    });

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");

    // Generar archivo y descargar
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length) {
      const file = target.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Obtener los datos como una matriz

        // Procesar los datos desde la fila 3
        this.processExcelData(jsonData);
      };

      reader.readAsArrayBuffer(file);
    }
  }

  private processExcelData(data: any[]) {
    // Reset existing passcodes so the import replaces them
    this.passcodes = [];

    // Start from row 2 (index 1), assuming row 1 is headers
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      console.log("Row:", row);

      // Make sure row has at least 2 values (name + code)
      if (row.length >= 2) {
        const name = row[1];  // Column A
        const code = row[2];  // Column B

        // Create passcode object
        const passcode = {
          name: name || '',
          tipo: 2, // default "Permanente Customizado"
          code: code || ''
        };

        // Add to array
        this.passcodes.push(passcode);
      }
    }

    console.log("Imported passcodes:", this.passcodes);
  }

  openLockSelector() {
    console.log(this.popupService.locksOfGroup)
    this.popupService.selectLocksForMultiplePasscodes = true;
  }

  async validarInputs() {
    this.error = "";
    if (this.passcodeService.selectedLocks.length === 0) {
      this.error = 'Debe seleccionar al menos una cerradura.';
      return;
    }
    for (let passcode of this.passcodes) {
      if (!passcode.name) {
        this.error = "Por favor rellene el campo 'Nombre'";
      }
      else if (!passcode.code && passcode.tipo == 2) {
        this.error = "Por favor rellene el campo 'Código'";
      }
      else if (!/^\d{6}$/.test(String(passcode.code)) && passcode.tipo == 2) {
        this.error = "Cada código debe tener exactamente 6 dígitos";
      }
    }
    if (this.error === '') {
      this.isLoading = true;
      try {
        const accessToken = sessionStorage.getItem('accessToken') ?? '';
        const response = await lastValueFrom(this.passcodeService.multiplePasscodes(accessToken, this.passcodes));
        this.popupService.multiplePasscodeResults = response;
        this.popupService.multiplePasscodesResult = true;
      } catch (error: any) {
        console.error('Error while creating multiple passcodes:', error);
        this.error = error?.error?.errmsg || 'No fue posible generar los códigos.';
      } finally {
        this.isLoading = false;
      }
    }
  }
}
