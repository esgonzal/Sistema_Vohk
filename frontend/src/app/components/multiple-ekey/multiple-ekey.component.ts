import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { Formulario } from '../../Interfaces/Formulario';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { RecipientList } from '../../Interfaces/RecipientList';
import { PopUpService } from '../../services/pop-up.service';
import { LockServiceService } from '../../services/lock-service.service';
import { lastValueFrom, retry } from 'rxjs';
import { UserServiceService } from '../../services/user-service.service';
import { checkUserInDBResponse, sendEkeyResponse, UserRegisterResponse } from '../../Interfaces/API_responses';
import { DomSanitizer } from '@angular/platform-browser';
import { faHome, faLock, faKey, faPerson, faPeopleGroup } from '@fortawesome/free-solid-svg-icons'
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
  results: any[] = [];
  faHome = faHome;
  faLock = faLock;
  faKey = faKey;
  faPerson = faPerson
  faPeopleGroup = faPeopleGroup
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
  /*
  async validarInputs(eKeys: any[]) {
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
      }
    }
    if (this.error === '') {
      for (const eKey of eKeys) {
        await this.crearEkey(eKey);
        await this.enviarEmail(eKey);
      }
      this.router.navigate(["users", this.ekeyService.username, "lock", this.ekeyService.lockID]);
    }
  }
  async crearEkey(eKey: { account: string; name: string; type: string; startDatepicker: string; startTimepicker: string, endDatepicker: string, endTimepicker: string, email: string }) {//Dependiendo del tipo de eKey se dan los datos necesarios para generarla
    this.isLoading = true;
    try {
      if (eKey.type === '1') {
        ///////////PERMANENTE////////////////////////////////
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, this.ekeyService.lockAlias, eKey.account, eKey.name, "0", "0", 0, 0, eKey.email)) as sendEkeyResponse;
        if (sendEkeyResponse.keyId) {//Ekey permanente se mandó correctamente
          //this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
          //this.popupService.emailSuccess = true;
        } else if (sendEkeyResponse.errcode === 10003) {
          sessionStorage.clear();
        } else if (sendEkeyResponse.errcode === -2019) {
          this.error = "No puedes enviarte una eKey a ti mismo."
        } else {
          console.log(sendEkeyResponse);
        }
      }
      else if (eKey.type === '2') {
        ///////////PERIODICA//////////////////////////////////////////////////////////////////
        let newStartDay = moment(eKey.startDatepicker).valueOf();
        let newEndDay = moment(eKey.endDatepicker).valueOf();
        let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(eKey.startTimepicker), "milliseconds").valueOf();
        let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(eKey.endTimepicker), "milliseconds").valueOf();
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, this.ekeyService.lockAlias, eKey.account, eKey.name, newStartDate.toString(), newEndDate.toString(), 0, 0, eKey.email)) as sendEkeyResponse;
        if (sendEkeyResponse.keyId) {//Ekey periodica se mandó correctamente
          //this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
          //this.popupService.emailSuccess = true;
        } else if (sendEkeyResponse.errcode === 10003) {
          sessionStorage.clear();
        } else if (sendEkeyResponse.errcode === -2019) {
          this.error = "No puedes enviarte una eKey a ti mismo."
        } else {
          console.log(sendEkeyResponse);
        }
      }
    } catch (error) {
      console.error("Error while creating Ekey:", error);
    } finally {
      this.isLoading = false;
    }

  }
  async enviarEmail(eKey: { account: string; name: string; type: string; startDatepicker: string; startTimepicker: string, endDatepicker: string, endTimepicker: string, email: string }) {
    //console.log("entra a enviarEmail")
    if (this.ekeyService.selectedLocks.length === 1) {
      const Alias = this.ekeyService.selectedLocks[0].alias;
      if (eKey.type === '1') {
        // Permanent eKey email
        const response = await lastValueFrom(this.ekeyService.generateEmail(this.ekeyService.userID, this.ekeyService.lockAlias, eKey.account, '0', '0', eKey.email)) as sendEkeyResponse;
        //console.log(response) (emailContent y toEmail)
        if (response.emailContent) {
          const updatedHtml = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          //console.log(sendEmailResponse); (success)
          this.popupService.createEkey = false;
          this.popupService.ekeySuccess = true;
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
          const updatedHtml = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          this.popupService.createEkey = false;
          this.popupService.ekeySuccess = true;
          //window.location.reload()
        }
      }
    }
  }
  */
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
      }
    }
    if (this.error === '') {
        for (const eKey of eKeys) {
          await this.crearEkey2(eKey);
          await this.enviarEmail2(eKey);
        }
      this.router.navigate(["users", this.ekeyService.username, "lock", this.ekeyService.lockID]);
    }
  }
  async crearEkey2(eKey: { account: string; name: string; type: string; startDatepicker: string; startTimepicker: string, endDatepicker: string, endTimepicker: string, email: string }) {
    this.isLoading = true;
    try {
      for (const lock of this.ekeyService.selectedLocks) {
        if (eKey.type === '1') {
          ///////////PERMANENTE////////////////////////////////
          let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, lock.id, lock.alias, eKey.account, eKey.name, "0", "0", 0, 0, eKey.email)) as sendEkeyResponse;
          if (sendEkeyResponse.keyId) {//Ekey permanente se mandó correctamente
            //this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
            //this.popupService.emailSuccess = true;
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
          } else if (sendEkeyResponse.errcode === -2019) {
            this.error = "No puedes enviarte una eKey a ti mismo."
          } else {
            console.log(sendEkeyResponse);
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
            //this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
            //this.popupService.emailSuccess = true;
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
          } else if (sendEkeyResponse.errcode === -2019) {
            this.error = "No puedes enviarte una eKey a ti mismo."
          } else {
            console.log(sendEkeyResponse);
          }
        }
      }
      
    } catch (error) {
      console.error("Error while creating Ekey:", error);
    } finally {
      this.isLoading = false;
    }

  }
  async enviarEmail2(eKey: { account: string; name: string; type: string; startDatepicker: string; startTimepicker: string, endDatepicker: string, endTimepicker: string, email: string }) {
    if (this.ekeyService.selectedLocks.length === 1) {
      const Alias = this.ekeyService.selectedLocks[0].alias;
      if (eKey.type === '1') {
        // Permanent eKey email
        const response = await lastValueFrom(this.ekeyService.generateEmail(this.ekeyService.userID, Alias, eKey.account, '0', '0', eKey.email)) as sendEkeyResponse;
        //console.log(response) (emailContent y toEmail)
        if (response.emailContent) {
          const updatedHtml = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          //console.log(sendEmailResponse); (success)
          this.popupService.createEkey = false;
          this.popupService.ekeySuccess = true;
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
          const updatedHtml = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          this.popupService.createEkey = false;
          this.popupService.ekeySuccess = true;
          //window.location.reload()
        }
      }
    } else {
      const Alias = this.ekeyService.selectedLocks.map(lock => `\n<br>- ${lock.alias}`).join('<br>\n');
      if (eKey.type === '1') {
        // Permanent eKey email
        const response = await lastValueFrom(this.ekeyService.generateEmail(this.ekeyService.userID, Alias, eKey.account, '0', '0', eKey.email)) as sendEkeyResponse;
        //console.log(response) (emailContent y toEmail)
        if (response.emailContent) {
          const updatedHtml = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          //console.log(sendEmailResponse); (success)
          this.popupService.createEkey = false;
          this.popupService.ekeySuccess = true;
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
          const updatedHtml = response.emailContent;
          let sendEmailResponse = await lastValueFrom(this.ekeyService.sendEmail(response.toEmail, updatedHtml));
          this.popupService.createEkey = false;
          this.popupService.ekeySuccess = true;
          //window.location.reload()
        }
      }
    } 
    
    
  }
  openLockSelector() {
    this.popupService.selectLocksForEkey = true;
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
    for (let i = 2; i < data.length; i++) {
      const row = data[i];

      // Asegurarse de que la fila tenga suficientes datos
      if (row.length >= 5) {
        const department = row[1]; // B: Departamento
        const ownerName = row[2]; // C: Nombre Propietario
        const email = row[3]; // D: Correo
        const phoneNumber = row[4]; // E: N° Telefono

        // Crear el objeto de eKey según el formato requerido
        const eKey = {
          account: `+56${phoneNumber}`, // Cuenta de Destino
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
