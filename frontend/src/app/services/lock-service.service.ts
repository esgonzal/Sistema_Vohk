import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LockListResponse, operationResponse } from '../Interfaces/API_responses';
import { LockDetails } from '../Interfaces/Lock';

@Injectable({
  providedIn: 'root'
})
export class LockServiceService {

  URL = 'http://34.176.182.56:8080';
  userID: string;
  lockID: number;

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
    let url = this.URL.concat('/api/vohk/lock/getListAccount');
    return this.http.post<LockListResponse>(url, body)
  }
  getLockDetails(userID: string, lockID: number): Observable<LockDetails> {
    let body = {userID, lockID};
    let url = this.URL.concat('/api/vohk/lock/details');
    return this.http.post<LockDetails>(url, body)
  }
  setAutoLock(userID: string, lockID: number, seconds: number): Observable<operationResponse> {
    let body = {userID, lockID, seconds}
    let url = this.URL.concat('/api/vohk/lock/setAutoLock');
    return this.http.post<operationResponse>(url, body);
  }
  transferLock(userID: string, receiverUsername: string, lockID: string): Observable<operationResponse> {
    let body = {userID, receiverUsername, lockID}
    let url = this.URL.concat('/api/ttlock/lock/transfer');
    return this.http.post<operationResponse>(url, body);
  }
}
