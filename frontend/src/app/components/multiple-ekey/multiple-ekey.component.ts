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
    private userService: UserServiceService) {
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
  validarInputs(eKeys: any[]) {
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
      this.crearEkeys(eKeys);
    }
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
  async crearEkeys(eKeys: any[]) {//Dependiendo del tipo de eKey se dan los datos necesarios para generarla
    this.isLoading = true;
    // 1 - Primero manda eKey. Dependiendo de la respuesta, se sabrá si es cuenta TTLock o cuenta VOHK
    // 2 - Si es cuenta TTLock(la eKey se mandó), hay que notificar por correo si el destinatario es email, por wsp si el destinatario es número
    // 3 - Si no es cuenta TTLock(la eKey no se mandó), hay 2 opciones: Es cuenta VOHK o es una cuenta que no existe
    // 4 - Se intenta registrar al destinatario. Dependiendo de la respuesta, se sabrá si es cuenta VOHK o cuenta que no existe
    // 5 - Si es cuenta VOHK (no se pudo registrar el destinatario porque ya existe alguien con ese nombre), hay que mandar la eKey a cuenta VOHK, notificar por correo
    //     si el destinatario es email, por wsp si el destinatario es número
    // 6 - Si es cuenta que no existe(se registró el destinatario), hay que mandar la eKey a cuenta nueva VOHK, notificar por correo si el destinatario es email, 
    //     por wsp si el destinatario es número
    try {
      for (const eKey of eKeys) {
        if (eKey.type === '1') {
          ///////////PERMANENTE////////////////////////////////
          let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, eKey.account, eKey.name, "0", "0", 1)) as sendEkeyResponse;
          if (sendEkeyResponse.keyId) {//Existe una cuenta TTLock de destinatario y la ekey fue enviada correctamente
            this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
            if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
              //this.ekeyService.sendEmail_permanentEkey(datos.recieverName, datos.name)
            } else {//El destinatario es celular asi que se manda mensaje
              console.log("mandar mensaje de wsp")
            }
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
            this.router.navigate(['/login']);
          } else if (sendEkeyResponse.errcode === -1002) {//No existe una cuenta TTLock con el nombre ingresado, asi que se intenta con cuenta VOHK
            let encode = this.userService.encodeNombre(eKey.account)
            let new_password = this.generateRandomPassword();
            let userRegisterResponse = await lastValueFrom(this.userService.UserRegister(eKey.account, new_password)) as UserRegisterResponse;
            if (userRegisterResponse.errcode === 0) {//El destinatario no tiene cuenta, se crea una cuenta VOHK
              sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, encode, eKey.name, "0", "0", 1))) as sendEkeyResponse;
              if (sendEkeyResponse.keyId) {//Se envia correctamente la ekey a la cuenta nueva
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
                if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
                  //this.ekeyService.sendEmail_permanentEkey_newAccount(datos.recieverName, datos.name, new_password)
                } else {//El destinatario es celular asi que se manda mensaje
                  console.log("mandar mensaje de wsp")
                }
              } else if (sendEkeyResponse.errcode === 10003) {
                sessionStorage.clear();
                this.router.navigate(['/login']);
              } else {//La ekey no se pudo enviar por alguna razón a la cuenta nueva
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Fallido", "Comentario": sendEkeyResponse.errmsg})
                console.log("Error:", sendEkeyResponse)
              }
            }
            else if (userRegisterResponse.errcode === 30003) {//El destinatario es una cuenta VOHK
              sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, encode, eKey.account, "0", "0", 1))) as sendEkeyResponse;
              if (sendEkeyResponse.keyId) {//Se envia correctamente la ekey a la cuenta VOHK
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
                if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
                  //this.ekeyService.sendEmail_permanentEkey(datos.recieverName, datos.name)
                } else {//El destinatario es celular asi que se manda mensaje
                  console.log("mandar mensaje de wsp")
                }
              } else if (sendEkeyResponse.errcode === 10003) {
                sessionStorage.clear();
                this.router.navigate(['/login']);
              } else {//La ekey no se pudo enviar por alguna razón a la cuenta VOHK
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Fallido", "Comentario": sendEkeyResponse.errmsg})
                console.log("Error:", sendEkeyResponse)
              }
            }
          }
        }
        else if (eKey.type === '2') {
          ///////////PERIODICA//////////////////////////////////////////////////////////////////
          let newStartDay = moment(eKey.startDatepicker).valueOf()
          let newEndDay = moment(eKey.endDatepicker).valueOf()
          let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(eKey.startTimepicker), "milliseconds").valueOf()
          let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(eKey.endTimepicker), "milliseconds").valueOf()
          let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, eKey.account, eKey.name, newStartDate.toString(), newEndDate.toString(), 1)) as sendEkeyResponse;
          if (sendEkeyResponse.keyId) {//Existe una cuenta TTLock de destinatario y la ekey fue enviada correctamente
            this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
            if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
              //this.ekeyService.sendEmail_permanentEkey(datos.recieverName, datos.name)
            } else {//El destinatario es celular asi que se manda mensaje
              console.log("mandar mensaje de wsp")
            }
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
            this.router.navigate(['/login']);
          } else if (sendEkeyResponse.errcode === -1002) {//No existe una cuenta TTLock con el nombre ingresado, asi que se intenta con cuenta VOHK
            let encode = this.userService.encodeNombre(eKey.account)
            let new_password = this.generateRandomPassword();
            let userRegisterResponse = await lastValueFrom(this.userService.UserRegister(eKey.account, new_password)) as UserRegisterResponse;
            if (userRegisterResponse.errcode === 0) {//El destinatario no tiene cuenta, se crea una cuenta VOHK
              sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, encode, eKey.name, newStartDate.toString(), newEndDate.toString(), 1))) as sendEkeyResponse;
              if (sendEkeyResponse.keyId) {//Se envia correctamente la ekey a la cuenta nueva
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
                if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
                  //this.ekeyService.sendEmail_periodicEkey_newAccount(datos.recieverName, datos.name, moment(newStartDate).format("YYYY/MM/DD HH:mm"), moment(newEndDate).format("YYYY/MM/DD HH:mm"), new_password)
                } else {//El destinatario es celular asi que se manda mensaje
                  console.log("mandar mensaje de wsp")
                }
              } else if (sendEkeyResponse.errcode === 10003) {
                sessionStorage.clear();
                this.router.navigate(['/login']);
              } else {//La ekey no se pudo enviar por alguna razón a la cuenta nueva
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Fallido", "Comentario": sendEkeyResponse.errmsg})
                console.log("Error:", sendEkeyResponse)
              }
            }
            else if (userRegisterResponse.errcode === 30003) {//El destinatario es una cuenta VOHK
              sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, encode, eKey.name, newStartDate.toString(), newEndDate.toString(), 1))) as sendEkeyResponse;
              if (sendEkeyResponse.keyId) {//Se envia correctamente la ekey a la cuenta VOHK
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
                if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
                  //this.ekeyService.sendEmail_periodicEkey(datos.recieverName, datos.name, moment(newStartDate).format("YYYY/MM/DD HH:mm"), moment(newEndDate).format("YYYY/MM/DD HH:mm"))
                } else {//El destinatario es celular asi que se manda mensaje
                  console.log("mandar mensaje de wsp")
                }
              } else if (sendEkeyResponse.errcode === 10003) {
                sessionStorage.clear();
                this.router.navigate(['/login']);
              } else {//La ekey no se pudo enviar por alguna razón a la cuenta VOHK
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Fallido", "Comentario": sendEkeyResponse.errmsg})
                console.log("Error:", sendEkeyResponse)
              }
            }
          }
        }
        else if (eKey.type === '3') {
          ///////////DE UN USO/////////////////////////////////////////////////////////////////////////////
          let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, eKey.account, eKey.name, moment().valueOf().toString(), "1", 1)) as sendEkeyResponse;
          if (sendEkeyResponse.keyId) {//Existe una cuenta TTLock de destinatario y la ekey fue enviada correctamente
            this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
            if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
              //this.ekeyService.sendEmail_oneTimeEkey(datos.recieverName, datos.name)
            } else {//El destinatario es celular asi que se manda mensaje
              console.log("mandar mensaje de wsp")
            }
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
            this.router.navigate(['/login']);
          } else if (sendEkeyResponse.errcode === -1002) {//No existe una cuenta TTLock con el nombre ingresado, asi que se intenta con cuenta VOHK
            let encode = this.userService.encodeNombre(eKey.account)
            let new_password = this.generateRandomPassword();
            let userRegisterResponse = await lastValueFrom(this.userService.UserRegister(eKey.account, new_password)) as UserRegisterResponse;
            if (userRegisterResponse.errcode === 0) {//El destinatario no tiene cuenta, se crea una cuenta VOHK
              sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, encode, eKey.name, moment().valueOf().toString(), "1", 1))) as sendEkeyResponse;
              if (sendEkeyResponse.keyId) {//Se envia correctamente la ekey a la cuenta nueva
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
                if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
                  //this.ekeyService.sendEmail_oneTimeEkey_newAccount(datos.recieverName, datos.name, new_password)
                } else {//El destinatario es celular asi que se manda mensaje
                  console.log("mandar mensaje de wsp")
                }
              } else if (sendEkeyResponse.errcode === 10003) {
                sessionStorage.clear();
                this.router.navigate(['/login']);
              } else {//La ekey no se pudo envío 
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Fallido", "Comentario": sendEkeyResponse.errmsg})
                console.log("Error:", sendEkeyResponse)
              }
            }
            else if (userRegisterResponse.errcode === 30003) {//El destinatario es una cuenta VOHK
              sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, encode, eKey.name, moment().valueOf().toString(), "1", 1))) as sendEkeyResponse;
              if (sendEkeyResponse.keyId) {//Se envia correctamente la ekey a la cuenta de PC
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
                if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
                  //this.ekeyService.sendEmail_oneTimeEkey(datos.recieverName, datos.name)
                } else {//El destinatario es celular asi que se manda mensaje
                  console.log("mandar mensaje de wsp")
                }
              } else if (sendEkeyResponse.errcode === 10003) {
                sessionStorage.clear();
                this.router.navigate(['/login']);
              } else {//La ekey no se pudo envío 
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Fallido", "Comentario": sendEkeyResponse.errmsg})
                console.log("Error:", sendEkeyResponse)
              }
            }
          }
        }
        else if (eKey.type === '4') {
          ///////////SOLICITANTE////////////////////////////////////////////
          let newStartDay = moment(eKey.startDatepicker).valueOf()
          let newEndDay = moment(eKey.endDatepicker).valueOf()
          let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(eKey.startTimepicker), "milliseconds").valueOf()
          let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(eKey.endTimepicker), "milliseconds").valueOf()
          const selectedDayNumbers: number[] = [];
          eKey.weekDays.forEach((day: { checked: any; value: number; }) => {
            if (day.checked) { selectedDayNumbers.push(day.value) }
          });
          let sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, eKey.account, eKey.name, newStartDate.toString(), newEndDate.toString(), 1, 4, newStartDay.toString(), newEndDay.toString(), JSON.stringify(selectedDayNumbers)))) as sendEkeyResponse;
          if (sendEkeyResponse.keyId) {//Existe una cuenta TTLock de destinatario y la ekey fue enviada correctamente
            this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
            if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
              //this.ekeyService.sendEmail_solicitanteEkey(datos.recieverName, datos.name, this.getSelectedDayNames(selectedDayNumbers, this.weekDays), moment(newStartDate).format('HH:mm'), moment(newEndDate).format('HH:mm'));
            } else {//El destinatario es celular asi que se manda mensaje
              console.log("mandar mensaje de wsp")
            }
          } else if (sendEkeyResponse.errcode === 10003) {
            sessionStorage.clear();
            this.router.navigate(['/login']);
          } else if (sendEkeyResponse.errcode === -1002) {//No existe una cuenta TTLock con el nombre ingresado, asi que se intenta con cuenta VOHK
            let encode = this.userService.encodeNombre(eKey.account)
            let new_password = this.generateRandomPassword();
            let userRegisterResponse = await lastValueFrom(this.userService.UserRegister(eKey.account, new_password)) as UserRegisterResponse;
            if (userRegisterResponse.errcode === 0) {//El destinatario no tiene cuenta, se crea una cuenta VOHK
              sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, encode, eKey.name, newStartDate.toString(), newEndDate.toString(), 1, 4, newStartDay.toString(), newEndDay.toString(), JSON.stringify(selectedDayNumbers)))) as sendEkeyResponse;
              if (sendEkeyResponse.keyId) {//Se envia correctamente la ekey a la cuenta nueva
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
                if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
                  //this.ekeyService.sendEmail_solicitanteEkey_newAccount(datos.recieverName, datos.name, this.getSelectedDayNames(selectedDayNumbers, this.weekDays), moment(newStartDate).format('HH:mm'), moment(newEndDate).format('HH:mm'), new_password);
                } else {//El destinatario es celular asi que se manda mensaje
                  console.log("mandar mensaje de wsp")
                }
              } else if (sendEkeyResponse.errcode === 10003) {
                sessionStorage.clear();
                this.router.navigate(['/login']);
              } else {//La ekey no se pudo envío 
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Fallido", "Comentario": sendEkeyResponse.errmsg})
                console.log("Error:", sendEkeyResponse)
              }
            }
            else if (userRegisterResponse.errcode === 30003) {//El destinatario es una cuenta VOHK
              sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.userID, this.ekeyService.lockID, encode, eKey.name, newStartDate.toString(), newEndDate.toString(), 1, 4, newStartDay.toString(), newEndDay.toString(), JSON.stringify(selectedDayNumbers)))) as sendEkeyResponse;
              if (sendEkeyResponse.keyId) {//Se envia correctamente la ekey a la cuenta de PC
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Exitoso"})
                if (this.userService.isValidEmail(eKey.account)) {//El destinatario es email asi que se manda correo
                  //this.ekeyService.sendEmail_solicitanteEkey(datos.recieverName, datos.name, this.getSelectedDayNames(selectedDayNumbers, this.weekDays), moment(newStartDate).format('HH:mm'), moment(newEndDate).format('HH:mm'));
                } else {//El destinatario es celular asi que se manda mensaje
                  console.log("mandar mensaje de wsp")
                }
              } else if (sendEkeyResponse.errcode === 10003) {
                sessionStorage.clear();
                this.router.navigate(['/login']);
              } else {//La ekey no se pudo envío 
                this.results.push({"Cuenta": eKey.account, "Nombre de eKey": eKey.name, "Resultado": "Fallido", "Comentario": sendEkeyResponse.errmsg})
                console.log("Error:", sendEkeyResponse)
              }
            }
          }
        }
      }
      console.log(this.results)
    } catch (error) {
      console.error("Error while creating Ekey:", error);
    } finally {
      this.isLoading = false;
    }
  }
}
