import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LockListResponse, operationResponse } from '../Interfaces/API_responses';
import { LockDetails } from '../Interfaces/Lock';
import moment from 'moment';

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


  constructor(private http: HttpClient) { }

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
}
