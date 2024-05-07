import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { UserServiceService } from '../../services/user-service.service';
import { LockServiceService } from '../../services/lock-service.service';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { LockListResponse, UserRegisterResponse, sendEkeyResponse } from '../../Interfaces/API_responses'
import { Formulario } from '../../Interfaces/Formulario';
import { PopUpService } from 'src/app/services/pop-up.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { faHome, faLock, faPerson } from '@fortawesome/free-solid-svg-icons'
import { LockData } from '../../Interfaces/Lock';
import { DarkModeService } from '../../services/dark-mode.service';


@Component({
  selector: 'app-ekey',
  templateUrl: './ekey.component.html',
  styleUrls: ['./ekey.component.css']
})
export class EkeyComponent implements OnInit {

  faHome = faHome;
  faLock = faLock;
  faPerson = faPerson
  recieverName: string;
  isLoading: boolean = false;
  currentGroup = sessionStorage.getItem("lockGroupID") ?? '';
  locksOfGroup: LockData[] = []
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


  constructor(
    private router: Router,
    private userService: UserServiceService,
    private lockService: LockServiceService,
    public ekeyService: EkeyServiceService,
    public popupService: PopUpService,
    private sanitizer: DomSanitizer,
    public DarkModeService: DarkModeService) {
    if (!this.ekeyService.username || !this.ekeyService.userID || !this.ekeyService.lockID || !this.ekeyService.endDateUser) {
      this.router.navigate(['users', sessionStorage.getItem('user'), 'lock', sessionStorage.getItem('lockID')])
    }
  }
  async ngOnInit() {
    this.isLoading = true;
    let pageNo = 1;
    const pageSize = 100;
    try {
      while (true) {
        let response = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.ekeyService.username, pageNo, pageSize, Number(this.currentGroup))) as LockListResponse;
        const filteredLocks = response.list.filter(lock => lock.keyRight === 1 || lock.userType === "110301");
        this.locksOfGroup.push(...filteredLocks);
        if (response.pages > pageNo) {
          pageNo++;
        } else {
          break;
        }
      }
    } catch (error) {
      console.error('Error fetching locks:', error);
    } finally {
      this.popupService.locksOfGroup = this.locksOfGroup;
      this.isLoading = false;
      this.ekeyService.selectedLocks = [{ id: this.ekeyService.lockID, alias: this.ekeyService.lockAlias }];
    }
  }
  toMultipleEkeys() {//Navega al componente multiple-ekey
    this.popupService.createEkey = false;
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
  isEmailNotificationRequired(): boolean {
    if (this.userService.isValidPhone(this.recieverName).isValid) {
      return true;
    } else {
      return false;
    }
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
      this.error = "Por favor llene el campo 'Cuenta de Destino'";
    } else if (!datos.ekeyType) {
      this.error = "Por favor elija un tipo de eKey";
    } else if (this.ekeyService.selectedLocks.length === 0) {
      this.error = "Por favor seleccione al menos una cerradura";
    } else if ((datos.ekeyType === '2' || datos.ekeyType === '4') && (!datos.startDate || !datos.endDate || !datos.startHour || !datos.endHour)) {
      this.error = "Por favor rellene los datos de fecha y/o hora";
    } else if (!this.userService.isValidEmail(datos.recieverName) && !this.userService.isValidPhone(datos.recieverName).isValid) {
      this.error = 'La Cuenta de Destino debe ser un email o número de telefono (+569)'
    }
    return this.error === '';
  }
  mapRemoteEnable(valor: boolean) {
    if (valor === true) {
      return 1;
    } else {
      return 2;
    }
  }
  mapKeyRight(valor: boolean) {
    if (valor === true) {
      return 1;
    } else {
      return 0;
    }
  }
  botonGenerarEkey(datos: Formulario) {//Combina las validaciones con la creacion de eKey
    if (this.validarInputs(datos)) {
      if (this.validarFechaInicio(datos.startDate, datos.startHour, datos.endDate, datos.endHour, datos.ekeyType)) {
        if (this.validaFechaUsuario(datos.endDate, datos.endHour, datos.ekeyType)) {
          this.crearEkey(datos);
          this.enviarEmail(datos);
        }
      }
    }
  }
  async crearEkey(datos: Formulario) {
    this.isLoading = true;
    //console.log(datos);
    try {
      for (const lock of this.ekeyService.selectedLocks) {
        if (datos.ekeyType === '1') {
          // Permanent eKey creation
          const sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, lock.id, lock.alias, datos.recieverName, datos.name, "0", "0", this.mapKeyRight(datos.keyRight), this.mapRemoteEnable(datos.remoteEnable), datos.email)) as sendEkeyResponse;
          if (sendEkeyResponse.keyId) {
            //this.popupService.emailMessage = this.sanitizer.bypassSecurityTrustHtml(sendEkeyResponse.emailContent);
            //this.popupService.emailSuccess = true;
            console.log(sendEkeyResponse);
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
          } else if (sendEkeyResponse.errcode === -2019) {
            this.error = "No puedes enviarte una eKey a ti mismo.";
          } else {
            console.log(sendEkeyResponse);
          }
        } else if (datos.ekeyType === '2') {
          // Periodic eKey creation
          const newStartDay = moment(datos.startDate).valueOf();
          const newEndDay = moment(datos.endDate).valueOf();
          const newStartDate = moment(newStartDay).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf();
          const newEndDate = moment(newEndDay).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf();
          const sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, lock.id, lock.alias, datos.recieverName, datos.name, newStartDate.toString(), newEndDate.toString(), this.mapKeyRight(datos.keyRight), this.mapRemoteEnable(datos.remoteEnable), datos.email)) as sendEkeyResponse;
          if (sendEkeyResponse.keyId) {
            console.log(sendEkeyResponse);
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
          } else if (sendEkeyResponse.errcode === -2019) {
            this.error = "No puedes enviarte una eKey a ti mismo.";
          } else {
            console.log(sendEkeyResponse);
          }
        }
      }
      this.isLoading = false;
      this.popupService.createEkey;
      //window.location.reload(); // Consider avoiding full page reload if possible
    } catch (error) {
      console.error("Error while creating Ekey:", error);
      this.isLoading = false;
    }
  }

  async enviarEmail(datos: Formulario) {
    //console.log("entra a enviarEmail")
    if (this.ekeyService.selectedLocks.length === 1) {
      const Alias = this.ekeyService.selectedLocks[0].alias;
      if (datos.ekeyType === '1') {
        // Permanent eKey email
        const response = await lastValueFrom(this.ekeyService.sendEmail(this.ekeyService.userID, Alias, datos.recieverName, '0', '0', datos.email)) as sendEkeyResponse;
        if (response.emailContent) {
          this.popupService.createEkey = false;
          window.location.reload()
        }
      } else if (datos.ekeyType === '2') {
        // Periodic eKey email
        const newStartDay = moment(datos.startDate).valueOf();
        const newEndDay = moment(datos.endDate).valueOf();
        const newStartDate = moment(newStartDay).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf();
        const newEndDate = moment(newEndDay).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf();
        const response = await lastValueFrom(this.ekeyService.sendEmail(this.ekeyService.userID, Alias, datos.recieverName, newStartDate.toString(), newEndDate.toString(), datos.email)) as sendEkeyResponse;
        if (response.emailContent) {
          this.popupService.createEkey = false;
          window.location.reload()
        }
      }
    } else {
      const Alias = this.ekeyService.selectedLocks.map(lock => `- ${lock.alias}`).join('<br>');
      if (datos.ekeyType === '1') {
        // Permanent eKey email for multiple locks
        const response = await lastValueFrom(this.ekeyService.sendEmail(this.ekeyService.userID, Alias, datos.recieverName, '0', '0', datos.email)) as sendEkeyResponse;
        if (response.emailContent) {
          this.popupService.createEkey = false;
          window.location.reload()
        }
      } else if (datos.ekeyType === '2') {
        // Periodic eKey email for multiple locks
        const newStartDay = moment(datos.startDate).valueOf();
        const newEndDay = moment(datos.endDate).valueOf();
        const newStartDate = moment(newStartDay).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf();
        const newEndDate = moment(newEndDay).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf();
        const response = await lastValueFrom(this.ekeyService.sendEmail(this.ekeyService.userID, Alias, datos.recieverName, newStartDate.toString(), newEndDate.toString(), datos.email)) as sendEkeyResponse;
        if (response.emailContent) {
          this.popupService.createEkey = false;
          window.location.reload()
        }
      }
    }
  }
  openLockSelector() {
    this.popupService.selectLocksForEkey = true;
  }
}
