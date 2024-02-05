import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { Formulario } from '../../Interfaces/Formulario';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { RecipientList } from '../../Interfaces/RecipientList';
import { PopUpService } from '../../services/pop-up.service';
import { LockServiceService } from '../../services/lock-service.service';
import { lastValueFrom } from 'rxjs';
import { UserServiceService } from '../../services/user-service.service';
import { checkUserInDBResponse, sendEkeyResponse, UserRegisterResponse } from '../../Interfaces/API_responses';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-multiple-ekey',
  templateUrl: './multiple-ekey.component.html',
  styleUrls: ['./multiple-ekey.component.css']
})
export class MultipleEkeyComponent implements OnInit {

  constructor(private router: Router,
    public ekeyService: EkeyServiceService,
    public popupService: PopUpService,
    private lockService: LockServiceService,
    private userService: UserServiceService,
    private sanitizer: DomSanitizer) {
    if (!this.ekeyService.username || !this.ekeyService.userID || !this.ekeyService.lockID || !this.ekeyService.endDateUser) {
      this.router.navigate(['users', sessionStorage.getItem('user'), 'lock', sessionStorage.getItem('lockID')])
    }
  }

  ngOnInit() {
    this.eKeys = [{
      account: '', name: '', type: '', startDatepicker: null, startTimepicker: '', endDatepicker: null, endTimepicker: '', weekDays: [
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

  isLoading: boolean = false;
  error = "";
  eKeys: any[] = [];
  results: any[] = []
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
    if (this.userService.isValidEmail(account) || this.userService.isValidPhone(account).isValid) {
      return true;
    } else {
      return false
    }
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
  async validarInputs(eKeys: any[]) {
    this.error = '';
    for (const eKey of eKeys) {
      if (!this.isAccountValid(eKey.account)) {
        this.error = "La cuenta de destinatario debe ser un correo electrónico o número de celular con código (+569)";
        break;
      }
      if (!eKey.name) {
        this.error = "Por favor rellene el campo 'Nombre de eKey'";
        break;
      }
      if (!eKey.type) {
        this.error = "Debe seleccionar un tipo de eKey";
        break;
      }
      if (!this.isDateAndTimeValid(eKey)) {
        this.error = "Por favor rellene los datos de fecha y/o hora";
        break;
      }
      if (!this.isCheckboxesValid(eKey)) {
        this.error = "Si va a crear una ekey solicitante, debe seleccionar al menos un día de habilitación";
        break;
      }
      if (!this.isEndDateValid(eKey)) {
        this.error = 'La fecha de finalización debe ser posterior a la fecha de inicio';
      }
    }
    if (this.error === '') {
      for (const eKey of eKeys) {
        console.log("creando la ekey : ", eKey)
        await this.crearEkey(eKey);
      }
      this.router.navigate(["users", this.ekeyService.username, "lock", this.ekeyService.lockID]);
    }
  }
  async crearEkey(eKey: {account: string; name: string; type: string; startDatepicker: string; startTimepicker: string, endDatepicker: string, endTimepicker: string }) {//Dependiendo del tipo de eKey se dan los datos necesarios para generarla
    this.isLoading = true;
    try {
      if (eKey.type === '1') {
        ///////////PERMANENTE////////////////////////////////
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, this.ekeyService.lockAlias, eKey.account, eKey.name, "0", "0", 0, 0)) as sendEkeyResponse;
        if (sendEkeyResponse.keyId) {//Ekey permanente se mandó correctamente
          this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
          this.popupService.emailSuccess = true;
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
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, this.ekeyService.lockAlias, eKey.account, eKey.name, newStartDate.toString(), newEndDate.toString(), 0, 0)) as sendEkeyResponse;
        if (sendEkeyResponse.keyId) {//Ekey periodica se mandó correctamente
          this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
          this.popupService.emailSuccess = true;
        } else if (sendEkeyResponse.errcode === 10003) {
          sessionStorage.clear();
        } else if (sendEkeyResponse.errcode === -2019) {
          this.error = "No puedes enviarte una eKey a ti mismo."
        } else {
          console.log(sendEkeyResponse);
        }
      }/*
      else if (eKey.type === '3') {
        ///////////DE UN USO/////////////////////////////////////////////////////////////////////////////
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, this.ekeyService.lockAlias, eKey.account, eKey.name, moment().valueOf().toString(), "1", 1)) as sendEkeyResponse;
        if (sendEkeyResponse.keyId) {//Ekey de un uso se mandó correctamente
          this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
          this.popupService.emailSuccess = true;
        } else if (sendEkeyResponse.errcode === 10003) {
          sessionStorage.clear();
          this.router.navigate(['/login']);
        } else if (sendEkeyResponse.errcode === -2019) {
          this.error = "No puedes enviarte una eKey a ti mismo."
        } else {
          console.log(sendEkeyResponse);
        }
      }
      else if (eKey.type === '4') {
        ///////////SOLICITANTE////////////////////////////////////////////
        let newStartDay = moment(eKey.startDatepicker).valueOf()
        let newEndDay = moment(eKey.endDatepicker).valueOf()
        let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(eKey.startTimepicker), "milliseconds").valueOf()
        let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(eKey.endTimepicker), "milliseconds").valueOf()
        const selectedDayNumbers: number[] = [];
        this.weekDays.forEach(day => {
          if (day.checked) { selectedDayNumbers.push(day.value) }
        });
        let sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, this.ekeyService.lockAlias, datos.recieverName, datos.name, newStartDate.toString(), newEndDate.toString(), 1, 4, newStartDay.toString(), newEndDay.toString(), JSON.stringify(selectedDayNumbers)))) as sendEkeyResponse;
        if (sendEkeyResponse.keyId) {//Ekey solicitante se mandó correctamente
          this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
          this.popupService.emailSuccess = true;
        } else if (sendEkeyResponse.errcode === 10003) {
          sessionStorage.clear();
          this.router.navigate(['/login']);
        } else if (sendEkeyResponse.errcode === -2019) {
          this.error = "No puedes enviarte una eKey a ti mismo."
        } else {
          console.log(sendEkeyResponse);
        }
      }
      */
    } catch (error) {
      console.error("Error while creating Ekey:", error);
    } finally {
      this.isLoading = false;
    }
    
  }

  getSelectedDayNames(selectedDayNumbers: number[], weekDays: { name: string; value: number; checked: boolean }[]): string {//Guarda el nombre de los dias seleccionados para mandarlos por correo
    const selectedDays = weekDays.filter(day => selectedDayNumbers.includes(day.value));
    const selectedDayNames = selectedDays.map(day => day.name);
    return selectedDayNames.join(', ');
  }
  
}
