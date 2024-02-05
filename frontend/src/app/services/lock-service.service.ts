import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LockListResponse, operationResponse } from '../Interfaces/API_responses';
import { LockDetails } from '../Interfaces/Lock';
import moment from 'moment';
import { Ekey, Fingerprint, Passcode } from '../Interfaces/Elements';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class LockServiceService {

  URL = 'https://api.vohkapp.com';
  userID: string;
  lockID: number;
  private sessionStorageKey = 'filteredLocks';

  // Getter for filteredLocks
  get filteredLocks(): { lockId: number; lockAlias: string }[] {
    const storedValue = sessionStorage.getItem(this.sessionStorageKey);
    return storedValue ? JSON.parse(storedValue) : [];
  }

  // Setter for filteredLocks
  set filteredLocks(value: { lockId: number; lockAlias: string }[]) {
    sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(value));
  }


  constructor(private http: HttpClient, private sanitizer: DomSanitizer) { }

  public transformarHora(Tiempo: string) {//Esta funcion está encargada de convertir el resultado del timepicker, un string de formato ("HH:mm"), en un number que representa el tiempo en milisegundos
    let tiempoHora = Tiempo.split(":")[0]
    let tiempoMinuto = Tiempo.split(":")[1]
    return ((Number(tiempoHora) * 60 + Number(tiempoMinuto)) * 60000).toString()
  }
  public checkFeature(featureValue: string, bit: number) {
    const binaryValue = BigInt(`0x${featureValue}`).toString(2)
    const reversedBinary = binaryValue.split('').reverse().join('');
    return reversedBinary[bit] === '1';
  }
  periodoValidez(start: number, end: number) {
    if (end === 0) { return 'Permanente' }
    else {
      var inicio = moment(start).format("YYYY/MM/DD HH:mm")
      var final = moment(end).format("YYYY/MM/DD HH:mm")
      var retorno = inicio.toString().concat(' - ').concat(final.toString());
      return retorno
    }
  }
  periodoValidezEkey(ekey: Ekey) {
    if (Number(ekey.endDate) === 1) {//UNA VEZ
      let retorno = moment(ekey.startDate).format('DD/MM/YYYY HH:mm').concat(" Una vez");
      return retorno;
    } else if (ekey.keyType === 4) {//SOLICITANTE
      const dayNames = ["Sabado", "Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
      let HoraInicio = moment(ekey.startDate).format('HH:mm');
      let HoraFinal = moment(ekey.endDate).format('HH:mm');
      let DiaInicio = moment(ekey.startDay).format('DD/MM/YYYY');
      let DiaFinal = moment(ekey.endDay).format('DD/MM/YYYY');
      let selectedDays = JSON.parse(ekey.weekDays);
      let formattedSelectedDays = selectedDays.map((day: number) => dayNames[day]).join(', ');
      let formattedResult = `${DiaInicio} - ${DiaFinal}, ${formattedSelectedDays}, ${HoraInicio} ~ ${HoraFinal}`;
      return formattedResult
    } else {
      return this.periodoValidez(Number(ekey.startDate), Number(ekey.endDate))
    }
  }
  periodoValidezPasscode(passcode: Passcode) {
    var respuesta
    if (passcode.keyboardPwdType === 1) {
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(' Una Vez');
    } else if (passcode.keyboardPwdType === 2) {
      respuesta = 'Permanente'
    } else if (passcode.keyboardPwdType === 3) {
      var inicio = moment(passcode.startDate).format("DD/MM/YYYY HH:mm")
      var final = moment(passcode.endDate).format("DD/MM/YYYY HH:mm")
      respuesta = inicio.toString().concat(' - ').concat(final.toString());
    } else if (passcode.keyboardPwdType === 4) {
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(' Borrar');
    } else if (passcode.keyboardPwdType === 5) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Fin de Semana")
    } else if (passcode.keyboardPwdType === 6) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Diaria")
    } else if (passcode.keyboardPwdType === 7) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Dia de Trabajo")
    } else if (passcode.keyboardPwdType === 8) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Lunes")
    } else if (passcode.keyboardPwdType === 9) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Martes")
    } else if (passcode.keyboardPwdType === 10) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Miercoles")
    } else if (passcode.keyboardPwdType === 11) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Jueves")
    } else if (passcode.keyboardPwdType === 12) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Viernes")
    } else if (passcode.keyboardPwdType === 13) {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Sabado")
    } else {
      var inicio = moment(passcode.startDate).format(" HH:mm")
      var final = moment(passcode.endDate).format(" HH:mm")
      respuesta = moment(passcode.sendDate).format("DD/MM/YYYY HH:mm").concat(", ", inicio, " - ", final, " Domingo")
    }
    return respuesta;
  }
  periodoValidezFingerprint(fingerprint: Fingerprint) {
    if (fingerprint.fingerprintType === 1) {
      return this.periodoValidez(fingerprint.startDate, fingerprint.endDate)
    }
    else {
      let HoraInicio: string;
      let HoraFinal: string;
      let minutosInicio;
      let minutosFinal;
      let fechaInicio = moment(fingerprint.startDate)
      let fechaFinal = moment(fingerprint.endDate)
      let retorno = fechaInicio.format("DD/MM/YYYY").toString().concat(' - ').concat(fechaFinal.format("DD/MM/YYYY").toString().concat("\n"));
      for (let index = 0; index < fingerprint.cyclicConfig.length; index++) {
        if (fingerprint.cyclicConfig[index].weekDay === 1) {
          retorno += ', Lunes';
        }
        if (fingerprint.cyclicConfig[index].weekDay === 2) {
          retorno += ', Martes';
        }
        if (fingerprint.cyclicConfig[index].weekDay === 3) {
          retorno += ', Miercoles';
        }
        if (fingerprint.cyclicConfig[index].weekDay === 4) {
          retorno += ', Jueves';
        }
        if (fingerprint.cyclicConfig[index].weekDay === 5) {
          retorno += ', Viernes';
        }
        if (fingerprint.cyclicConfig[index].weekDay === 6) {
          retorno += ', Sabado';
        }
        if (fingerprint.cyclicConfig[index].weekDay === 7) {
          retorno += ', Domingo';
        }
        minutosInicio = fingerprint.cyclicConfig[index].startTime
        minutosFinal = fingerprint.cyclicConfig[index].endTime
      }
      //SE AGREGA EL TIEMPO DE CICLO A LA FECHA
      fechaInicio.add(minutosInicio, 'minutes')
      fechaFinal.add(minutosFinal, 'minutes')
      fechaFinal.add(1, 'minutes');//POR ALGUNA RAZON LE FALTA UN MINUTO A LA HORA FINAL TALVEZ REDONDEA MAL
      //AGREGAR UN 0 AL INICIO PARA QUE QUEDE 09:00 EN VEZ DE 9:00
      if (fechaInicio.hours() < 10) {
        let cero = "0";
        cero = cero.concat(fechaInicio.hours().toString())
        HoraInicio = cero
      } else {
        HoraInicio = fechaInicio.hours().toString()
      }
      //SE HACE LO MISMO CON MINUTOS Y SE JUNTAN PARA QUE QUEDE 09:08 EN VEZ DE 09:8
      if (fechaInicio.minutes() < 10) {
        let cero = "0";
        cero = cero.concat(fechaInicio.minutes().toString())
        HoraInicio = HoraInicio.concat(":").concat(cero);
      } else {
        HoraInicio = HoraInicio.concat(":").concat(fechaInicio.minutes().toString())
      }
      //HACER LO MISMO CON HORA FINAL
      if (fechaFinal.hours() < 10) {
        let cero = "0";
        cero = cero.concat(fechaFinal.hours().toString())
        HoraFinal = cero
      } else {
        HoraFinal = fechaFinal.hours().toString()
      }
      if (fechaFinal.minutes() < 10) {
        let cero = "0";
        cero = cero.concat(fechaFinal.minutes().toString())
        HoraFinal = HoraFinal.concat(":").concat(cero);
      } else {
        HoraFinal = HoraFinal.concat(":").concat(fechaFinal.minutes().toString())
      }
      retorno = retorno.concat("\n").concat(HoraInicio).concat(" ~ ").concat(HoraFinal)
      return retorno
    }
  }
  consultarEstado(end: number) {
    if (end === 0) { return this.sanitizer.bypassSecurityTrustHtml('<span style="color: green;">Valido</span>'); }
    else {
      var ahora = moment()
      var final = moment(end)
      if (moment(final).isBefore(ahora)) {
        return this.sanitizer.bypassSecurityTrustHtml('<span style="color: red;">Caducado</span>');
      }
      else { return this.sanitizer.bypassSecurityTrustHtml('<span style="color: green;">Valido</span>'); }
    }
  }
  consultarEstadoEkey(ekey: Ekey) {
    if (ekey.keyStatus === "110402") {//PENDING
      return this.sanitizer.bypassSecurityTrustHtml('<span style="color: gray;">Pendiente</span>');
    }
    if (ekey.keyStatus === "110405") {//FREEZED
      return this.sanitizer.bypassSecurityTrustHtml('<span style="color: blue;">Congelada</span>');
    }
    else {//NORMAL
      if (!ekey.endDay) {//MIENTRAS NO SEA SOLICITANTE 
        if (Number(ekey.endDate) === 0) {//PERMANENTE
          return this.sanitizer.bypassSecurityTrustHtml('<span style="color: green;">Valido</span>');
        }
        if (Number(ekey.endDate) === 1) {//UNA VEZ
          if (moment(ekey.startDate).add(1, "hour").isAfter(moment())) {
            return this.sanitizer.bypassSecurityTrustHtml('<span style="color: green;">Valido</span>');
          } else {
            return this.sanitizer.bypassSecurityTrustHtml('<span style="color: red;">Invalido</span>');
          }
        }
        else {//PERIODICA
          return this.consultarEstado(Number(ekey.endDate))
        }
      }
      else {//SOLICITANTE
        let fecha = moment(ekey.endDay).format("YYYY-MM-DD");
        let tiempo = moment(ekey.endDate).format("YYYY-MM-DD/HH:mm")
        tiempo = tiempo.split("/")[1];
        let end = fecha.concat(" ", tiempo);
        return this.consultarEstado(moment(end).valueOf())
      }
    }
  }
  consultarEstadoPasscode(passcode: Passcode) {
    if (passcode.keyboardPwdType === 1) {
      let seisHoras = moment(passcode.startDate).add(6, 'hours')
      let ahora = moment()
      if (ahora.isAfter(seisHoras)) {
        return 'Caducado'
      } else {
        return 'Valido'
      }
    }
    if (passcode.keyboardPwdType === 2) {
      return 'Valido'
    }
    if (passcode.keyboardPwdType === 3) {
      let ahora = moment()
      let inicio = moment(passcode.startDate)
      let final = moment(passcode.endDate)
      if (ahora.isBefore(inicio) || ahora.isAfter(final) || final.isBefore(inicio)) {
        return 'Inactivo'
      } else {
        return 'Valido'
      }
    }
    if (passcode.keyboardPwdType === 4) {
      return 'Valido'
    }
    else {
      return 'Valido'
    }
  }
  consultarSuccess(success: number) {
    if (success == 0) { return 'Fallido' }
    else { return 'Exito' }
  }
  consultarMetodo(tipo: number, operador: string) {
    switch (tipo) {
      case 1:
        return 'Abrir con la aplicación';
      case 4:
        return 'Abrir con código de acceso';
      case 5:
        return 'modify a passcode on the lock';
      case 6:
        return 'delete a passcode on the lock';
      case 7:
        var retorno = 'Abrir con código de acceso—'.concat(operador)
        return retorno;
      case 8:
        return 'clear passcodes from the lock';
      case 9:
        return 'passcode be squeezed out';
      case 10:
        return 'unlock with passcode with delete function, passcode before it will all be deleted';
      case 11:
        var retorno = 'Abrir con código de acceso—'.concat(operador)
        return retorno;
      case 12:
        var retorno = 'Abrir con código de acceso—'.concat(operador)
        return retorno;
      case 13:
        var retorno = 'Abrir con código de acceso—'.concat(operador)
        return retorno;
      case 14:
        return 'lock power on';
      case 15:
        return 'add card success';
      case 16:
        return 'clear cards';
      case 17:
        return 'Abrir con Tarjeta RF';
      case 18:
        return 'delete an card';
      case 19:
        return 'unlock by wrist strap success';
      case 20:
        return 'Abrir con huella digital';
      case 21:
        return 'add fingerprint';
      case 22:
        return 'Abrir con huella digital';
      case 23:
        return 'delete a fingerprint';
      case 24:
        return 'clear fingerprints';
      case 25:
        return 'Abrir con Tarjeta RF';
      case 26:
        return 'Cerrar con Aplicación';
      case 27:
        return 'unlock by Mechanical key';
      case 28:
        return 'Abrir de forma remota';
      case 29:
        return 'apply some force on the Lock';
      case 30:
        return 'Door sensor closed';
      case 31:
        return 'Door sensor open';
      case 32:
        return 'open from inside';
      case 33:
        return 'lock by fingerprint';
      case 34:
        return 'lock by passcode';
      case 35:
        return 'lock by card';
      case 36:
        return 'lock by Mechanical key';
      case 37:
        return 'Remote Control';
      case 38:
        return 'unlock by passcode failed—The door has been double locked';
      case 39:
        return 'unlock by IC card failed—The door has been double locked';
      case 40:
        return 'Abrir con huella digital';
      case 41:
        return 'unlock by app failed—The door has been double locked';
      case 42:
        return 'received new local mail';
      case 43:
        return 'received new other cities\' mail';
      case 44:
        return 'Tamper alert';
      case 45:
        return 'Se cierra automáticamente al final del Modo de Paso';
      case 46:
        return 'unlock by unlock key';
      case 47:
        return 'lock by lock key';
      case 48:
        return '¡Detectados intentos de acceso no autorizados!';
      case 49:
        return 'unlock by hotel card';
      case 50:
        return 'Unlocked due to the high temperature';
      case 51:
        return 'unlock by card failed—card in blacklist';
      case 52:
        return 'Dead lock with APP';
      case 53:
        return 'Dead lock with passcode';
      case 54:
        return 'The car left (for parking lock)';
      case 55:
        return 'unlock with key fob';
      case 57:
        return 'Unlock with QR code success';
      case 58:
        return 'Unlock with QR code failed, it\'s expired';
      case 59:
        return 'Double locked';
      case 60:
        return 'Cancel double lock';
      case 61:
        return 'Lock with QR code success';
      case 62:
        return 'Lock with QR code failed, the lock is double locked';
      case 63:
        return 'Auto unlock at passage mode';
      case 64:
        return 'Door unclosed alarm';
      case 65:
        return 'Failed to unlock';
      case 66:
        return 'Failed to lock';
      case 67:
        return 'Face unlock success';
      case 68:
        return 'Face unlock failed - door locked from inside';
      case 69:
        return 'Lock with face';
      case 70:
        return 'Face registration success';
      case 71:
        return 'Face unlock failed - expired or ineffective';
      case 72:
        return 'Delete face success';
      case 73:
        return 'Clear face success';
      case 74:
        return 'IC card unlock failed - CPU secure information error';
      case 75:
        return 'App authorized button unlock success';
      case 76:
        return 'Gateway authorized button unlock success';
      case 77:
        return 'Dual authentication Bluetooth unlock verification success, waiting for second user';
      case 78:
        return 'Dual authentication password unlock verification success, waiting for second user';
      case 79:
        return 'Dual authentication fingerprint unlock verification success, waiting for second user';
      case 80:
        return 'Dual authentication IC card unlock verification success, waiting for second user';
      case 81:
        return 'Dual authentication face card unlock verification success, waiting for second user';
      case 82:
        return 'Dual authentication wireless key unlock verification success, waiting for second user';
      case 83:
        return 'Dual authentication palm vein unlock verification success, waiting for second user';
      case 84:
        return 'Palm vein unlock success';
      case 85:
        return 'Palm vein unlock success';
      case 86:
        return 'Lock with palm vein';
      case 87:
        return 'Register palm vein success';
      case 88:
        return 'Palm vein unlock failed - expired or ineffective';
      default:
        return 'Unknown type';
    }
  }
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const formattedMoment = moment(date).format('DD/MM/YYYY HH:mm');
    return formattedMoment; 
  }
  getLockListAccount(userID: string): Observable<LockListResponse> {
    let pageNo = 1;
    let pageSize = 100;
    let body = {userID, pageNo, pageSize};
    let url = this.URL.concat('/v0/lock/getListAccount');
    return this.http.post<LockListResponse>(url, body)
  }
  getLockDetails(userID: string, lockID: number): Observable<LockDetails> {
    let body = {userID, lockID};
    let url = this.URL.concat('/v0/lock/details');
    return this.http.post<LockDetails>(url, body)
  }
  setAutoLock(userID: string, lockID: number, seconds: number): Observable<operationResponse> {
    let body = {userID, lockID, seconds}
    let url = this.URL.concat('/v0/lock/setAutoLock');
    return this.http.post<operationResponse>(url, body);
  }
  transferLock(userID: string, receiverUsername: string, lockID: string): Observable<operationResponse> {
    let body = {userID, receiverUsername, lockID}
    let url = this.URL.concat('/v0/lock/transfer');
    return this.http.post<operationResponse>(url, body);
  }
  
}
