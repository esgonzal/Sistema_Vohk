import { Component } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { Formulario } from '../../Interfaces/Formulario';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { RecipientList } from '../../Interfaces/RecipientList';
import { PopUpService } from '../../services/pop-up.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { lastValueFrom } from 'rxjs';
import { UserServiceService } from 'src/app/services/user-service.service';
import { checkUserInDBResponse, sendEkeyResponse, UserRegisterResponse } from 'src/app/Interfaces/API_responses';
import { from } from 'rxjs';


@Component({
  selector: 'app-multiple-ekey',
  templateUrl: './multiple-ekey.component.html',
  styleUrls: ['./multiple-ekey.component.css']
})
export class MultipleEkeyComponent {

  constructor(private router: Router,
    public ekeyService: EkeyServiceService,
    public popupService: PopUpService,
    private lockService: LockServiceService,
    private userService: UserServiceService) {
      if(!this.ekeyService.username || !this.ekeyService.token || !this.ekeyService.lockID || !this.ekeyService.endDateUser) {
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
  selectedLocks: number[] = []//Add the lockIds of selected locks
  recipientes: RecipientList[] = []//Add the name and ekeyName to be sent for every lock in selectedLocks

  onSelected(value: string): void {
    this.selectedType = value
  }
  onCheckboxChange(event: any, day: any) {
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
  async crearEkey(datos: Formulario, lockID: number) {
    this.isLoading = true;
    try {
      if (datos.ekeyType === '1') {
        ///////////PERMANENTE////////////////////////////////
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, datos.recieverName, datos.name, "0", "0", 1)) as sendEkeyResponse;
        if (sendEkeyResponse.errcode === 0) {//Existe una cuenta TTLock de destinatario y la ekey fue enviada correctamente
          //Se agrega la eKey a la base de datos VOHK
          const response2 = await lastValueFrom(this.ekeyService.createEkeyDB(datos.recieverName, lockID, true));
          console.log(response2)
          if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
            //this.ekeyService.sendEmail_permanentEkey(datos.recieverName, datos.name)
          } else {//El destinatario es celular asi que se manda mensaje
            console.log("mandar mensaje de wsp")
          }
        }
        else if (sendEkeyResponse.errcode === -1002) {//No existe una cuenta TTLock con el nombre ingresado, asi que se intenta con cuenta VOHK
          let encode = this.userService.customBase64Encode(datos.recieverName)
          let new_password = this.generateRandomPassword();
          let userRegisterResponse = await lastValueFrom(this.userService.UserRegister(encode, new_password)) as UserRegisterResponse;
          if (userRegisterResponse.username) {//El destinatario no tiene cuenta, se crea una cuenta VOHK
            sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, 'bhaaa_'.concat(encode), datos.name, "0", "0", 1))) as sendEkeyResponse;
            if (sendEkeyResponse.errcode === 0) {//Se envia correctamente la ekey a la cuenta nueva
              //Se agrega la eKey a la base de datos VOHK
              const response2 = await lastValueFrom(this.ekeyService.createEkeyDB('bhaaa_'.concat(encode), lockID, true));
              console.log(response2)
              if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
                //this.ekeyService.sendEmail_permanentEkey_newAccount(datos.recieverName, datos.name, new_password)
                //Como la cuenta se creó, hay que agregarla a la base de datos
                const existsInDB = await lastValueFrom(this.userService.checkUserInDB('bhaaa_'.concat(encode))) as checkUserInDBResponse;
                if (existsInDB.exists === false) {
                  const response2 = await lastValueFrom(this.userService.createUserDB('bhaaa_'.concat(encode), datos.recieverName, datos.recieverName, datos.recieverName, '', new_password));
                  console.log(response2)
                }
              } else {//El destinatario es celular asi que se manda mensaje
                console.log("mandar mensaje de wsp")
                //Como la cuenta se creó, hay que agregarla a la base de datos
                const existsInDB = await lastValueFrom(this.userService.checkUserInDB('bhaaa_'.concat(encode))) as checkUserInDBResponse;
                if (existsInDB.exists === false) {
                  const response2 = await lastValueFrom(this.userService.createUserDB('bhaaa_'.concat(encode), datos.recieverName, datos.recieverName, '', datos.recieverName, new_password));
                  console.log(response2)
                }
              }
            } else {//La ekey no se pudo enviar por alguna razón a la cuenta nueva
              console.log("Error:", sendEkeyResponse)
            }
          }
          else if (userRegisterResponse.errcode === 30003) {//El destinatario es una cuenta VOHK
            sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, 'bhaaa_'.concat(encode), datos.name, "0", "0", 1))) as sendEkeyResponse;
            if (sendEkeyResponse.errcode === 0) {//Se envia correctamente la ekey a la cuenta VOHK
              //Se agrega la eKey a la base de datos VOHK
              const response2 = await lastValueFrom(this.ekeyService.createEkeyDB('bhaaa_'.concat(encode), lockID, true));
              console.log(response2)
              if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
                //this.ekeyService.sendEmail_permanentEkey(datos.recieverName, datos.name)
              } else {//El destinatario es celular asi que se manda mensaje
                console.log("mandar mensaje de wsp")
              }
            } else {//La ekey no se pudo enviar por alguna razón a la cuenta VOHK
              console.log("Error:", sendEkeyResponse)
            }
          }
        }
      }
      else if (datos.ekeyType === '2') {
        ///////////PERIODICA//////////////////////////////////////////////////////////////////
        let newStartDay = moment(datos.startDate).valueOf()
        let newEndDay = moment(datos.endDate).valueOf()
        let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf()
        let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf()
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, datos.recieverName, datos.name, newStartDate.toString(), newEndDate.toString(), 1)) as sendEkeyResponse;
        if (sendEkeyResponse.errcode === 0) {//Existe una cuenta TTLock de destinatario y la ekey fue enviada correctamente
          //Se agrega la eKey a la base de datos VOHK
          const response2 = await lastValueFrom(this.ekeyService.createEkeyDB(datos.recieverName, lockID, true));
          console.log(response2)
          if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
            //this.ekeyService.sendEmail_permanentEkey(datos.recieverName, datos.name)
          } else {//El destinatario es celular asi que se manda mensaje
            console.log("mandar mensaje de wsp")
          }
        }
        else if (sendEkeyResponse.errcode === -1002) {//No existe una cuenta TTLock con el nombre ingresado, asi que se intenta con cuenta VOHK
          let encode = this.userService.customBase64Encode(datos.recieverName)
          let new_password = this.generateRandomPassword();
          let userRegisterResponse = await lastValueFrom(this.userService.UserRegister(encode, new_password)) as UserRegisterResponse;
          if (userRegisterResponse.username) {//El destinatario no tiene cuenta, se crea una cuenta VOHK
            sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, 'bhaaa_'.concat(encode), datos.name, newStartDate.toString(), newEndDate.toString(), 1))) as sendEkeyResponse;
            if (sendEkeyResponse.errcode === 0) {//Se envia correctamente la ekey a la cuenta nueva
              //Se agrega la eKey a la base de datos VOHK
              const response2 = await lastValueFrom(this.ekeyService.createEkeyDB('bhaaa_'.concat(encode), lockID, true));
              console.log(response2)
              if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
                //this.ekeyService.sendEmail_periodicEkey_newAccount(datos.recieverName, datos.name, moment(newStartDate).format("YYYY/MM/DD HH:mm"), moment(newEndDate).format("YYYY/MM/DD HH:mm"), new_password)
                //Como la cuenta se creó, hay que agregarla a la base de datos
                const existsInDB = await lastValueFrom(this.userService.checkUserInDB('bhaaa_'.concat(encode))) as checkUserInDBResponse;
                if (existsInDB.exists === false) {
                  const response2 = await lastValueFrom(this.userService.createUserDB('bhaaa_'.concat(encode), datos.recieverName, datos.recieverName, datos.recieverName, '', new_password));
                  console.log(response2)
                }
              } else {//El destinatario es celular asi que se manda mensaje
                console.log("mandar mensaje de wsp")
                //Como la cuenta se creó, hay que agregarla a la base de datos
                const existsInDB = await lastValueFrom(this.userService.checkUserInDB('bhaaa_'.concat(encode))) as checkUserInDBResponse;
                if (existsInDB.exists === false) {
                  const response2 = await lastValueFrom(this.userService.createUserDB('bhaaa_'.concat(encode), datos.recieverName, datos.recieverName, '', datos.recieverName, new_password));
                  console.log(response2)
                }
              }
            } else {//La ekey no se pudo enviar por alguna razón a la cuenta nueva
              console.log("Error:", sendEkeyResponse)
            }
          }
          else if (userRegisterResponse.errcode === 30003) {//El destinatario es una cuenta VOHK
            sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, 'bhaaa_'.concat(encode), datos.name, newStartDate.toString(), newEndDate.toString(), 1))) as sendEkeyResponse;
            if (sendEkeyResponse.errcode === 0) {//Se envia correctamente la ekey a la cuenta VOHK
              //Se agrega la eKey a la base de datos VOHK
              const response2 = await lastValueFrom(this.ekeyService.createEkeyDB('bhaaa_'.concat(encode), lockID, true));
              console.log(response2)
              if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
                //this.ekeyService.sendEmail_periodicEkey(datos.recieverName, datos.name, moment(newStartDate).format("YYYY/MM/DD HH:mm"), moment(newEndDate).format("YYYY/MM/DD HH:mm"))
              } else {//El destinatario es celular asi que se manda mensaje
                console.log("mandar mensaje de wsp")
              }
            } else {//La ekey no se pudo enviar por alguna razón a la cuenta VOHK
              console.log("Error:", sendEkeyResponse)
            }
          }
        }
      }
      else if (datos.ekeyType === '3') {
        ///////////DE UN USO/////////////////////////////////////////////////////////////////////////////
        let sendEkeyResponse = await lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, datos.recieverName, datos.name, moment().valueOf().toString(), "1", 1)) as sendEkeyResponse;
        if (sendEkeyResponse.errcode === 0) {//Existe una cuenta TTLock de destinatario y la ekey fue enviada correctamente
          //Se agrega la eKey a la base de datos VOHK
          const response2 = await lastValueFrom(this.ekeyService.createEkeyDB(datos.recieverName, lockID, true));
          console.log(response2)
          if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
            //this.ekeyService.sendEmail_oneTimeEkey(datos.recieverName, datos.name)
          } else {//El destinatario es celular asi que se manda mensaje
            console.log("mandar mensaje de wsp")
          }
        }
        else if (sendEkeyResponse.errcode === -1002) {//No existe una cuenta TTLock con el nombre ingresado, asi que se intenta con cuenta VOHK
          let encode = this.userService.customBase64Encode(datos.recieverName)
          let new_password = this.generateRandomPassword();
          let userRegisterResponse = await lastValueFrom(this.userService.UserRegister(encode, new_password)) as UserRegisterResponse;
          if (userRegisterResponse.username) {//El destinatario no tiene cuenta, se crea una cuenta VOHK
            sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, 'bhaaa_'.concat(encode), datos.name, moment().valueOf().toString(), "1", 1))) as sendEkeyResponse;
            if (sendEkeyResponse.errcode === 0) {//Se envia correctamente la ekey a la cuenta nueva
              //Se agrega la eKey a la base de datos VOHK
              const response2 = await lastValueFrom(this.ekeyService.createEkeyDB('bhaaa_'.concat(encode), lockID, true));
              console.log(response2)
              if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
                //this.ekeyService.sendEmail_oneTimeEkey_newAccount(datos.recieverName, datos.name, new_password)
                //Como la cuenta se creó, hay que agregarla a la base de datos
                const existsInDB = await lastValueFrom(this.userService.checkUserInDB('bhaaa_'.concat(encode))) as checkUserInDBResponse;
                if (existsInDB.exists === false) {
                  const response2 = await lastValueFrom(this.userService.createUserDB('bhaaa_'.concat(encode), datos.recieverName, datos.recieverName, datos.recieverName, '', new_password));
                  console.log(response2)
                }
              } else {//El destinatario es celular asi que se manda mensaje
                console.log("mandar mensaje de wsp")
                //Como la cuenta se creó, hay que agregarla a la base de datos
                const existsInDB = await lastValueFrom(this.userService.checkUserInDB('bhaaa_'.concat(encode))) as checkUserInDBResponse;
                if (existsInDB.exists === false) {
                  const response2 = await lastValueFrom(this.userService.createUserDB('bhaaa_'.concat(encode), datos.recieverName, datos.recieverName, '', datos.recieverName, new_password));
                  console.log(response2)
                }
              }
            } else {//La ekey no se pudo envío 
              console.log("Error:", sendEkeyResponse)
            }
          }
          else if (userRegisterResponse.errcode === 30003) {//El destinatario es una cuenta VOHK
            sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, 'bhaaa_'.concat(encode), datos.name, moment().valueOf().toString(), "1", 1))) as sendEkeyResponse;
            if (sendEkeyResponse.errcode === 0) {//Se envia correctamente la ekey a la cuenta de PC
              //Se agrega la eKey a la base de datos VOHK
              const response2 = await lastValueFrom(this.ekeyService.createEkeyDB('bhaaa_'.concat(encode), lockID, true));
              console.log(response2)
              if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
                //this.ekeyService.sendEmail_oneTimeEkey(datos.recieverName, datos.name)
              } else {//El destinatario es celular asi que se manda mensaje
                console.log("mandar mensaje de wsp")
              }
            } else {//La ekey no se pudo envío 
              console.log("Error:", sendEkeyResponse)
            }
          }
        }
      }
      else if (datos.ekeyType === '4') {
        ///////////SOLICITANTE////////////////////////////////////////////
        let newStartDay = moment(datos.startDate).valueOf()
        let newEndDay = moment(datos.endDate).valueOf()
        let newStartDate = moment(newStartDay).add(this.lockService.transformarHora(datos.startHour), "milliseconds").valueOf()
        let newEndDate = moment(newEndDay).add(this.lockService.transformarHora(datos.endHour), "milliseconds").valueOf()
        const selectedDayNumbers: number[] = [];
        this.weekDays.forEach(day => {
          if (day.checked) { selectedDayNumbers.push(day.value) }
        });
        let sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, datos.recieverName, datos.name, newStartDate.toString(), newEndDate.toString(), 1, 4, newStartDay.toString(), newEndDay.toString(), JSON.stringify(selectedDayNumbers)))) as sendEkeyResponse;
        if (sendEkeyResponse.errcode === 0) {//Existe una cuenta TTLock de destinatario y la ekey fue enviada correctamente
          //Se agrega la eKey a la base de datos VOHK
          const response2 = await lastValueFrom(this.ekeyService.createEkeyDB(datos.recieverName, lockID, true));
          console.log(response2)
          if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
            //this.ekeyService.sendEmail_solicitanteEkey(datos.recieverName, datos.name, this.getSelectedDayNames(selectedDayNumbers, this.weekDays), moment(newStartDate).format('HH:mm'), moment(newEndDate).format('HH:mm'));
          } else {//El destinatario es celular asi que se manda mensaje
            console.log("mandar mensaje de wsp")
          }
        }
        else if (sendEkeyResponse.errcode === -1002) {//No existe una cuenta TTLock con el nombre ingresado, asi que se intenta con cuenta VOHK
          let encode = this.userService.customBase64Encode(datos.recieverName)
          let new_password = this.generateRandomPassword();
          let userRegisterResponse = await lastValueFrom(this.userService.UserRegister(encode, new_password)) as UserRegisterResponse;
          if (userRegisterResponse.username) {//El destinatario no tiene cuenta, se crea una cuenta VOHK
            sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, 'bhaaa_'.concat(encode), datos.name, newStartDate.toString(), newEndDate.toString(), 1, 4, newStartDay.toString(), newEndDay.toString(), JSON.stringify(selectedDayNumbers)))) as sendEkeyResponse;
            if (sendEkeyResponse.errcode === 0) {//Se envia correctamente la ekey a la cuenta nueva
              //Se agrega la eKey a la base de datos VOHK
              const response2 = await lastValueFrom(this.ekeyService.createEkeyDB('bhaaa_'.concat(encode), lockID, true));
              console.log(response2)
              if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
                //this.ekeyService.sendEmail_solicitanteEkey_newAccount(datos.recieverName, datos.name, this.getSelectedDayNames(selectedDayNumbers, this.weekDays), moment(newStartDate).format('HH:mm'), moment(newEndDate).format('HH:mm'), new_password);
                //Como la cuenta se creó, hay que agregarla a la base de datos
                const existsInDB = await lastValueFrom(this.userService.checkUserInDB('bhaaa_'.concat(encode))) as checkUserInDBResponse;
                if (existsInDB.exists === false) {
                  const response2 = await lastValueFrom(this.userService.createUserDB('bhaaa_'.concat(encode), datos.recieverName, datos.recieverName, datos.recieverName, '', new_password));
                  console.log(response2)
                }
              } else {//El destinatario es celular asi que se manda mensaje
                console.log("mandar mensaje de wsp")
                //Como la cuenta se creó, hay que agregarla a la base de datos
                const existsInDB = await lastValueFrom(this.userService.checkUserInDB('bhaaa_'.concat(encode))) as checkUserInDBResponse;
                if (existsInDB.exists === false) {
                  const response2 = await lastValueFrom(this.userService.createUserDB('bhaaa_'.concat(encode), datos.recieverName, datos.recieverName, '', datos.recieverName, new_password));
                  console.log(response2)
                }
              }
            } else {//La ekey no se pudo envío 
              console.log("Error:", sendEkeyResponse)
            }
          }
          else if (userRegisterResponse.errcode === 30003) {//El destinatario es una cuenta VOHK
            sendEkeyResponse = await (lastValueFrom(this.ekeyService.sendEkey(this.ekeyService.token, lockID, 'bhaaa_'.concat(encode), datos.name, newStartDate.toString(), newEndDate.toString(), 1, 4, newStartDay.toString(), newEndDay.toString(), JSON.stringify(selectedDayNumbers)))) as sendEkeyResponse;
            if (sendEkeyResponse.errcode === 0) {//Se envia correctamente la ekey a la cuenta de PC
              //Se agrega la eKey a la base de datos VOHK
              const response2 = await lastValueFrom(this.ekeyService.createEkeyDB('bhaaa_'.concat(encode), lockID, true));
              console.log(response2)
              if (this.userService.isValidEmail(datos.recieverName)) {//El destinatario es email asi que se manda correo
                //this.ekeyService.sendEmail_solicitanteEkey(datos.recieverName, datos.name, this.getSelectedDayNames(selectedDayNumbers, this.weekDays), moment(newStartDate).format('HH:mm'), moment(newEndDate).format('HH:mm'));
              } else {//El destinatario es celular asi que se manda mensaje
                console.log("mandar mensaje de wsp")
              }
            } else {//La ekey no se pudo envío 
              console.log("Error:", sendEkeyResponse)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error while creating Ekey:", error);
    } finally {
      this.isLoading = false;
    }
  }
  async validarNuevaEkey(datos: Formulario, lockID: number) {
    this.error = '';
    if (!datos.recieverName) {
      this.error = "Por favor llene el campo 'Nombre del Recipiente'"
    }
    else {
      if (!datos.ekeyType) {
        this.error = "Por favor elija un tipo de eKey"
      }
      else {
        if ((datos.ekeyType === '2' || datos.ekeyType === '4') && (!datos.startDate || !datos.endDate || !datos.startHour || !datos.endHour)) {
          this.error = "Por favor rellene los datos de fecha y/o hora"
        }
        else {
          if (this.validarFechaInicio(datos.startDate, datos.startHour, datos.endDate, datos.endHour, datos.ekeyType)) {
            if (this.validaFechaUsuario(datos.endDate, datos.endHour, datos.ekeyType)) {
              await this.crearEkey(datos, lockID);
              this.router.navigate(["users", this.ekeyService.username, "lock", this.ekeyService.lockID]);
            }
          }
        }
      }
    }
  }
  async generarMultiple(datos: Formulario) {
    if (this.ekeyService.selectedLocks.length === 0) {
      this.error = "Seleccione al menos 1 cerradura";
    }
    else if (this.ekeyService.recipients.length === 0) {
      this.error = "Agregue al menos 1 destinatario";
    }
    else {
      for (let i = 0; i < this.ekeyService.selectedLocks.length; i++) {
        const lockId = this.ekeyService.selectedLocks[i];
        for (let j = 0; j < this.ekeyService.recipients.length; j++) {
          datos.name = this.ekeyService.recipients[j].ekeyName;
          datos.recieverName = this.ekeyService.recipients[j].username;
          console.log("generando ekey de cerradura",lockId,"para usuario",datos.recieverName)
          await this.validarNuevaEkey(datos, lockId)
        }
      }
    }
  }
}
