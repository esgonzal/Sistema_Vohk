import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { MultiplePasscodeResponse, PasscodeResponse } from 'src/app/Interfaces/API_responses';
import { DarkModeService } from 'src/app/services/dark-mode.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { PasscodeServiceService } from 'src/app/services/passcode-service.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { UserServiceService } from 'src/app/services/user-service.service';
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
    public popupService: PopUpService,
    private lockService: LockServiceService,
    private userService: UserServiceService,
    public DarkModeService: DarkModeService) {
    if (!this.passcodeService.username || !this.passcodeService.userID || !this.passcodeService.lockID || !this.passcodeService.endDateUser) {
      this.router.navigate(['users', sessionStorage.getItem('user'), 'lock', sessionStorage.getItem('lockID')])
    }
  }

  ngOnInit() {
    this.passcodes = [{
      name: '', tipo: 2, code: '',
    }];
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
        const name = row[0];  // Column A
        const code = row[1];  // Column B

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
    for (let passcode of this.passcodes) {
      if (!passcode.name) {
        this.error = "Por favor rellene el campo 'Nombre'";
      }
      else if (!passcode.code && passcode.tipo == 2) {
        this.error = "Por favor rellene el campo 'Código'";
      }
      else if (passcode.code.length < 4 && passcode.tipo == 2) {
        this.error = "El código deber tener al menos 4 dígitos";
      }
    }
    if (this.error === '') {
      this.isLoading = true;
      let response = await lastValueFrom(this.passcodeService.multiplePasscodes(this.passcodeService.userID, this.passcodes)) as MultiplePasscodeResponse[]
      this.popupService.multiplePasscodeResults = response;
      //console.log(this.popupService.multiplePasscodeResults)
      this.isLoading = false;
      this.popupService.multiplePasscodesResult = true;
    }
  }
}
