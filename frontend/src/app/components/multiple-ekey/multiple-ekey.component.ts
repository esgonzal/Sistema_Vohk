import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { PopUpService } from '../../services/pop-up.service';
import { LockServiceService } from '../../services/lock-service.service';
import { lastValueFrom } from 'rxjs';
import { UserServiceService } from '../../services/user-service.service';
import { sendEkeyResponse } from '../../Interfaces/API_responses';
import { DomSanitizer } from '@angular/platform-browser';
import { DarkModeService } from 'src/app/services/dark-mode.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-multiple-ekey',
  templateUrl: './multiple-ekey.component.html',
  styleUrls: ['./multiple-ekey.component.css']
})
export class MultipleEkeyComponent implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef;

  isLoading: boolean = false;
  error = "";
  eKeys: any[] = [];
  aliases = "";

  constructor(private router: Router,
    public ekeyService: EkeyServiceService,
    public popupService: PopUpService,
    private lockService: LockServiceService,
    private userService: UserServiceService,
    private sanitizer: DomSanitizer,
    public DarkModeService: DarkModeService) {
    if (!this.ekeyService.username || !this.ekeyService.userID || !this.ekeyService.lockID || !this.ekeyService.endDateUser) {
      this.router.navigate(['users', sessionStorage.getItem('user'), 'lock', sessionStorage.getItem('lockID')])
    }
  }

  ngOnInit() {
    this.eKeys = [{
      account: '', name: '', type: '', startDatepicker: null, startTimepicker: '', endDatepicker: null, endTimepicker: '', email: '', weekDays: [
        { name: 'L', value: 2, checked: false },
        { name: 'M', value: 3, checked: false },
        { name: 'M', value: 4, checked: false },
        { name: 'J', value: 5, checked: false },
        { name: 'V', value: 6, checked: false },
        { name: 'S', value: 7, checked: false },
        { name: 'D', value: 1, checked: false }
      ]
    }];
  }
  onCheckboxChange(event: any, day: any) {
    day.checked = event.target.checked
  }
  removeEKey(index: number) {
    this.eKeys.splice(index, 1); // Remove the eKey at the specified index
  }
  addEKey() {
    const newEKey = {
      account: '',
      name: '',
      type: '',
      startDatepicker: null,
      startTimepicker: '',
      endDatepicker: null,
      endTimepicker: '',
      email: '',
      weekDays: [
        { name: 'L', value: 2, checked: false },
        { name: 'M', value: 3, checked: false },
        { name: 'M', value: 4, checked: false },
        { name: 'J', value: 5, checked: false },
        { name: 'V', value: 6, checked: false },
        { name: 'S', value: 7, checked: false },
        { name: 'D', value: 1, checked: false }
      ]
    };
    this.eKeys.push(newEKey);
  }
  isAccountValid(account: string) {
    if (this.isAccountEmail(account) || this.isAccountPhone(account)) {
      return true;
    } else {
      return false
    }
  }
  isAccountPhone(account: string) {
    if (this.userService.isValidPhone(account).isValid) {
      return true;
    } else {
      return false;
    }
  }
  isAccountEmail(account: string) {
    if (this.userService.isValidEmail(account)) {
      return true;
    } else
      return false;
  }
  isDateAndTimeValid(eKey: { type: string; startDatepicker: any; startTimepicker: any; endDatepicker: any; endTimepicker: any; }): boolean {
    if (eKey.type === '2' || eKey.type === '4') {
      return eKey.startDatepicker && eKey.startTimepicker && eKey.endDatepicker && eKey.endTimepicker;
    }
    return true; // No validation needed if not type 2 or 4
  }
  isEndDateValid(eKey: { type: string; startDatepicker: any; startTimepicker: any; endDatepicker: any; endTimepicker: any; }): boolean {
    if (eKey.type === '2' || eKey.type === '4') {
      const startDateTime = moment(eKey.startDatepicker).add(this.lockService.transformarHora(eKey.startTimepicker), 'milliseconds');
      const endDateTime = moment(eKey.endDatepicker).add(this.lockService.transformarHora(eKey.endTimepicker), 'milliseconds');
      if (endDateTime.isBefore(startDateTime)) {
        return false;
      }
    }
    return true; // No validation needed for other types or if validation passed
  }
  isCheckboxesValid(eKey: { type: string; weekDays: any[]; }): boolean {
    if (eKey.type === '4') {
      return eKey.weekDays && eKey.weekDays.some((day: { checked: any; }) => day.checked);
    }
    return true; // No validation needed for other types
  }
  getSelectedDayNames(selectedDayNumbers: number[], weekDays: { name: string; value: number; checked: boolean }[]): string {//Guarda el nombre de los dias seleccionados para mandarlos por correo
    const selectedDays = weekDays.filter(day => selectedDayNumbers.includes(day.value));
    const selectedDayNames = selectedDays.map(day => day.name);
    return selectedDayNames.join(', ');
  }
  async validarInputs2(eKeys: any[]) {
    this.error = '';
    for (const eKey of eKeys) {
      if (!this.isAccountValid(eKey.account)) {
        this.error = "La cuenta de destinatario debe ser un correo electrónico o número de celular con código (+569)";
        break;
      } else if (!eKey.name) {
        this.error = "Por favor rellene el campo 'Nombre de eKey'";
        break;
      } else if (!eKey.type) {
        this.error = "Debe seleccionar un tipo de eKey";
        break;
      } else if (!this.isDateAndTimeValid(eKey)) {
        this.error = "Por favor rellene los datos de fecha y/o hora";
        break;
      } else if (!this.isCheckboxesValid(eKey)) {
        this.error = "Si va a crear una ekey solicitante, debe seleccionar al menos un día de habilitación";
        break;
      } else if (!this.isEndDateValid(eKey)) {
        this.error = 'La fecha de finalización debe ser posterior a la fecha de inicio';
      } else if ((this.userService.isValidPhone(eKey.account).isValid) && (!eKey.email) ) {
        this.error = 'Ingrese un correo electrónico para recibir una notificación'
      }
    }
    if (this.error === '') {
      for (const eKey of eKeys) {
        if (await this.crearEkey2(eKey)) {
          await this.generarEmail2(eKey);
        }
        
      }
      this.popupService.ekeySuccess2 = true;
      //this.router.navigate(["users", this.ekeyService.username, "lock", this.ekeyService.lockID]);
    }
  }
  async crearEkey2(eKey: { account: string; name: string; type: string; startDatepicker: string; startTimepicker: string, endDatepicker: string, endTimepicker: string, email: string }) {
    this.isLoading = true;
    try {
      if (this.userService.isValidPhone(eKey.account).isValid) {
        eKey.account = this.userService.normalizePhone(eKey.account);
      }
      for (const lock of this.ekeyService.selectedLocks) {
        if (eKey.type === '1') {
          ///////////PERMANENTE////////////////////////////////
          let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, lock.id, lock.alias, eKey.account, eKey.name, "0", "0", 0, 0, eKey.email)) as sendEkeyResponse;
          if (sendEkeyResponse.keyId) {//Ekey permanente se mandó correctamente
            return true;
            //this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
            //this.popupService.emailSuccess = true;
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
            return false;
          } else if (sendEkeyResponse.errcode === -2019) {
            this.error = "No puedes enviarte una eKey a ti mismo."
            return false;
          } else {
            console.log(sendEkeyResponse);
            return false;
          }
        }
        else if (eKey.type === '2') {
          ///////////PERIODICA//////////////////////////////////////////////////////////////////
          let newStartDay = moment(eKey.startDatepicker).valueOf();
          let newEndDay = moment(eKey.endDatepicker).valueOf();
          let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(eKey.startTimepicker), "milliseconds").valueOf();
          let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(eKey.endTimepicker), "milliseconds").valueOf();
          let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, lock.id, lock.alias, eKey.account, eKey.name, newStartDate.toString(), newEndDate.toString(), 0, 0, eKey.email)) as sendEkeyResponse;
          if (sendEkeyResponse.keyId) {//Ekey periodica se mandó correctamente
            return true;
            //this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
            //this.popupService.emailSuccess = true;
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
            return false;
          } else if (sendEkeyResponse.errcode === -2019) {
            this.error = "No puedes enviarte una eKey a ti mismo."
            return false;
          } else {
            console.log(sendEkeyResponse);
            return false;
          }
        }
      }
    } catch (error) {
      console.error("Error while creating Ekey:", error);
      return false;
    } finally {
      this.isLoading = false;
    }
    return false;
  }
  async generarEmail2(eKey: { account: string; name: string; type: string; startDatepicker: string; startTimepicker: string, endDatepicker: string, endTimepicker: string, email: string }) {
    if (this.ekeyService.selectedLocks.length === 1) {
      const Alias = this.ekeyService.selectedLocks[0].alias;
      if (eKey.type === '1') {
        // Permanent eKey email
        const response = await lastValueFrom(this.ekeyService.generateEmail(this.ekeyService.userID, Alias, eKey.account, '0', '0', eKey.email)) as sendEkeyResponse;
        //console.log(response)
        if (response.emailContent) {
          this.popupService.toEmail = response.toEmail;
          this.popupService.emailMessage = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, response.emailContent));
          //console.log(sendEmailResponse)
          //this.popupService.emailSuccess = true;
          //const updatedHtml = response.emailContent;
          //let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          //console.log(sendEmailResponse); (success)
          //this.popupService.createEkey = false;
          //this.popupService.ekeySuccess = true;
          //window.location.reload()
        }
      } else if (eKey.type === '2') {
        // Periodic eKey email
        let newStartDay = moment(eKey.startDatepicker).valueOf();
        let newEndDay = moment(eKey.endDatepicker).valueOf();
        let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(eKey.startTimepicker), "milliseconds").valueOf();
        let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(eKey.endTimepicker), "milliseconds").valueOf();
        const response = await lastValueFrom(this.ekeyService.generateEmail(this.ekeyService.userID, Alias, eKey.account, newStartDate.toString(), newEndDate.toString(), eKey.email)) as sendEkeyResponse;
        if (response.emailContent) {
          this.popupService.toEmail = response.toEmail;
          this.popupService.emailMessage = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, response.emailContent));
          //this.popupService.emailSuccess = true;
          //const updatedHtml = response.emailContent;
          //let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          //this.popupService.createEkey = false;
          //this.popupService.ekeySuccess = true;
          //window.location.reload()
        }
      }
    } else {
      const Alias = this.ekeyService.selectedLocks.map(lock => `<li>${lock.alias}</li>`).join('');
      if (eKey.type === '1') {
        // Permanent eKey email
        const response = await lastValueFrom(this.ekeyService.generateEmail(this.ekeyService.userID, Alias, eKey.account, '0', '0', eKey.email)) as sendEkeyResponse;
        if (response.emailContent) {
          //console.log(response)
          this.popupService.toEmail = response.toEmail;
          this.popupService.emailMessage = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, response.emailContent));
          console.log(sendEmailResponse)
          //this.popupService.emailSuccess = true;
          //const updatedHtml = response.emailContent;
          //let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          //console.log(sendEmailResponse); (success)
          //this.popupService.createEkey = false;
          //this.popupService.ekeySuccess = true;
          //window.location.reload()
        }
      } else if (eKey.type === '2') {
        // Periodic eKey email
        let newStartDay = moment(eKey.startDatepicker).valueOf();
        let newEndDay = moment(eKey.endDatepicker).valueOf();
        let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(eKey.startTimepicker), "milliseconds").valueOf();
        let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(eKey.endTimepicker), "milliseconds").valueOf();
        const response = await lastValueFrom(this.ekeyService.generateEmail(this.ekeyService.userID, Alias, eKey.account, newStartDate.toString(), newEndDate.toString(), eKey.email)) as sendEkeyResponse;
        //console.log(response)
        if (response.emailContent) {
          this.popupService.toEmail = response.toEmail;
          this.popupService.emailMessage = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, response.emailContent));
          console.log(sendEmailResponse)
          //this.popupService.emailSuccess = true;
          //const updatedHtml = response.emailContent;
          //let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          //this.popupService.createEkey = false;
          //this.popupService.ekeySuccess = true;
          //window.location.reload()
        }
      }
    }


  }
  openLockSelector() {
    this.popupService.selectLocksForEkey = true;
  }
  downloadExcelTemplate(): void {
    // Crear un libro de trabajo
    const workbook = XLSX.utils.book_new();
    const headerStyle = {
      fill: {
        fgColor: { rgb: "FFDDDDDD" }, // Color de fondo (gris claro)
      },
      font: {
        bold: true, // Negrita
      },
      alignment: {
        horizontal: "center", // Centrar el texto
      },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      }
    };
    // Crear una hoja de trabajo con los datos deseados
    const worksheetData = [
      [], // Línea 1: Vacía
      ["", "N° DEPTO", "NOMBRE", "TELEFONO", "EMAIL"], // Línea 2
      ["", "", "", "+56", ""] // Línea 3: Formato de ejemplo para Teléfono
    ];
    // Crear la hoja a partir de los datos
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const headerCells = ["B2", "C2", "D2", "E2"]; // Celdas del encabezado
    headerCells.forEach(cell => {
        worksheet[cell].s = headerStyle; // Aplicar estilo a cada celda del encabezado
    });
    // Agregar la hoja al libro de trabajo
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
    // Generar el archivo Excel y disparar la descarga
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

    // Comenzar desde la fila 3 (índice 2)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];


      // Asegurarse de que la fila tenga suficientes datos
      if (row.length >= 4) {
        const department = row[0]; // B: Departamento
        const ownerName = row[1]; // C: Nombre Propietario
        const phoneNumber = row[2]; // D: N° Telefono
        const email = row[3]; // E: Correo

        // Crear el objeto de eKey según el formato requerido
        const formattedPhoneNumber = String(phoneNumber).replace(/\s+/g, '');
        const eKey = {
          account: `+${formattedPhoneNumber}`, // Cuenta de Destino
          name: `${ownerName} - ${department}`, // Nombre de Ekey
          type: '1', // Tipo: 1 (Permanente)
          email: email // Correo
        };

        // Agregar el objeto de eKey al array
        this.eKeys.push(eKey);
      }
    }

    console.log(this.eKeys); // Ver los eKeys en la consola
  }





}
