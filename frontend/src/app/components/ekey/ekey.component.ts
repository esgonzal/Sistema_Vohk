import { Component } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { UserServiceService } from '../../services/user-service.service';
import { LockServiceService } from '../../services/lock-service.service';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { UserRegisterResponse, sendEkeyResponse } from '../../Interfaces/API_responses'
import { Formulario } from '../../Interfaces/Formulario';
import { PopUpService } from 'src/app/services/pop-up.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-ekey',
  templateUrl: './ekey.component.html',
  styleUrls: ['./ekey.component.css']
})
export class EkeyComponent {

  constructor(
    private router: Router,
    private userService: UserServiceService,
    private lockService: LockServiceService,
    public ekeyService: EkeyServiceService,
    public popupService: PopUpService,
    private sanitizer: DomSanitizer) {
    if (!this.ekeyService.username || !this.ekeyService.userID || !this.ekeyService.lockID || !this.ekeyService.endDateUser) {
      this.router.navigate(['users', sessionStorage.getItem('user'), 'lock', sessionStorage.getItem('lockID')])
    }
  }

  isLoading: boolean = false;
  error = "";
  selectedType = '';
  weekDays = [
    { name: 'Lunes', value: 2, checked: false },
    { name: 'Martes', value: 3, checked: false },
    { name: 'Miercoles', value: 4, checked: false },
    { name: 'Jueves', value: 5, checked: false },
    { name: 'Viernes', value: 6, checked: false },
    { name: 'Sabado', value: 7, checked: false },
    { name: 'Domingo', value: 1, checked: false }
  ];

  toMultipleEkeys() {//Navega al componente multiple-ekey
    this.router.navigate(['users', this.ekeyService.username, 'lock', this.ekeyService.lockID, 'ekey', 'multiple'])
  }
  onSelected(value: string): void {//Guarda el tipo de eKey seleccionado
    this.selectedType = value
  }
  onCheckboxChange(event: any, day: any) {//Guarda los dias seleccionados para una eKey de tipo solicitante
    day.checked = event.target.checked
  }
  generateRandomPassword(): string {//Esta funcion retorna una contraseña random 
    const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@$%*?&";
    const getRandomChar = (charset: string) => {
      const randomIndex = Math.floor(Math.random() * charset.length);
      return charset.charAt(randomIndex);
    };
    let password = "";
    for (let i = 0; i < 6; i++) {
      password += getRandomChar(lowercaseChars);
    }
    password += getRandomChar(numbers);
    password += getRandomChar(symbols);
    return password;
  }
  getSelectedDayNames(selectedDayNumbers: number[], weekDays: { name: string; value: number; checked: boolean }[]): string {//Guarda el nombre de los dias seleccionados para mandarlos por correo
    const selectedDays = weekDays.filter(day => selectedDayNumbers.includes(day.value));
    const selectedDayNames = selectedDays.map(day => day.name);
    return selectedDayNames.join(', ');
  }
  validaFechaUsuario(diaFinal: string, horaFinal: string, tipo: string): boolean {//Calcula si el usuario puede crear una eKey dependiendo de su tiempo restante de validacion
    if (this.ekeyService.endDateUser !== '0') {
      if (tipo === '1' || tipo === '3') {//La ekey es permanente
        this.error = "Usted como usuario con autorización temporal no puede crear una eKey permanente"
        return false
      } else {
        let unixTimestamp = parseInt(this.ekeyService.endDateUser);
        let endUser = moment.unix(unixTimestamp / 1000);
        let endDate = moment(diaFinal).add(this.lockService.transformarHora(horaFinal), "milliseconds")
        if (endUser.isBefore(endDate)) {//El usuario termina antes que la ekey
          this.error = "La eKey termina posterior a su permiso de autorización, comuníquese con el administrador de esta cerradura"
          return false;
        } else {//El usuario termina despues que la ekey
          return true
        }
      }
    } else {//El usuario es permanente
      return true;
    }
  }
  validarFechaInicio(diaInicial: string, horaInicial: string, diaFinal: string, horaFinal: string, tipo: string): boolean {//Calcula si el usuario puede crear una eKey dependiendo de las fechas ingresadas
    if (tipo !== '1' && tipo !== '3') {
      let startDate = moment(diaInicial).add(this.lockService.transformarHora(horaInicial), "milliseconds")
      let endDate = moment(diaFinal).add(this.lockService.transformarHora(horaFinal), "milliseconds")
      if (endDate.isBefore(startDate)) {//La ekey termina antes de la fecha de inicio
        this.error = "El tiempo de inicio debe ser anterior al tiempo de finalización"
        return false;
      } else {//La ekey termina despues de la fecha de inicio
        return true;
      }
    } else {//La ekey es permanente
      return true
    }
  }
  validarInputs(datos: Formulario): boolean {//Verifica que el usuario rellenó los campos necesarios para crear una eKey
    this.error = '';
    if (!datos.recieverName) {
      this.error = "Por favor llene el campo 'Nombre del Destinatario'";
    } else if (!datos.ekeyType) {
      this.error = "Por favor elija un tipo de eKey";
    } else if ((datos.ekeyType === '2' || datos.ekeyType === '4') && (!datos.startDate || !datos.endDate || !datos.startHour || !datos.endHour)) {
      this.error = "Por favor rellene los datos de fecha y/o hora";
    } else if (!this.userService.isValidEmail(datos.recieverName) && !this.userService.isValidPhone(datos.recieverName).isValid) {
      this.error = 'El usuario ingresado debe ser un email o número de telefono'
    }
    return this.error === '';
  }
  botonGenerarEkey(datos: Formulario) {//Combina las validaciones con la creacion de eKey
    if (this.validarInputs(datos)) {
      if (this.validarFechaInicio(datos.startDate, datos.startHour, datos.endDate, datos.endHour, datos.ekeyType)) {
        if (this.validaFechaUsuario(datos.endDate, datos.endHour, datos.ekeyType)) {
          this.crearEkey(datos);
        }
      }
    }
  }
  async crearEkey(datos: Formulario) {//Dependiendo del tipo de eKey se dan los datos necesarios para generarla
    this.isLoading = true;
    try {
      if (datos.ekeyType === '1') {
        ///////////PERMANENTE////////////////////////////////
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, this.ekeyService.lockAlias, datos.recieverName, datos.name, "0", "0", 1)) as sendEkeyResponse;
        if (sendEkeyResponse.keyId) {//Ekey permanente se mandó correctamente
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
      else if (datos.ekeyType === '2') {
        ///////////PERIODICA//////////////////////////////////////////////////////////////////
        let newStartDay = moment(datos.startDate).valueOf();
        let newEndDay = moment(datos.endDate).valueOf();
        let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf();
        let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf();
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, this.ekeyService.lockAlias, datos.recieverName, datos.name, newStartDate.toString(), newEndDate.toString(), 1)) as sendEkeyResponse;
        if (sendEkeyResponse.keyId) {//Ekey periodica se mandó correctamente
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
      else if (datos.ekeyType === '3') {
        ///////////DE UN USO/////////////////////////////////////////////////////////////////////////////
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, this.ekeyService.lockAlias, datos.recieverName, datos.name, moment().valueOf().toString(), "1", 1)) as sendEkeyResponse;
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
      else if (datos.ekeyType === '4') {
        console.log(datos)
        ///////////SOLICITANTE////////////////////////////////////////////
        let newStartDay = moment(datos.startDate).valueOf()
        let newEndDay = moment(datos.endDate).valueOf()
        let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf()
        let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf()
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
    } catch (error) {
      console.error("Error while creating Ekey:", error);
    } finally {
      this.isLoading = false;
    }
  }
}
