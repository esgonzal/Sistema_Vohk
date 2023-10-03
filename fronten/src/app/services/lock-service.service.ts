import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import moment from 'moment';
import 'moment-timezone';
import { LockListResponse, operationResponse } from '../Interfaces/API_responses';
import { LockDetails } from '../Interfaces/Lock';

@Injectable({
  providedIn: 'root'
})
export class LockServiceService {

  token: string;
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
  getLockListAccount(token: string): Observable<LockListResponse> {
    let pageNo = 1;
    let pageSize = 100;
    let body = {token, pageNo, pageSize};
    let url = 'http://localhost:3000/api/ttlock/lock/getListAccount';
    return this.http.post<LockListResponse>(url, body)
  }
  getLockDetails(token: string, lockID: number): Observable<LockDetails> {
    let body = {token, lockID};
    let url = 'http://localhost:3000/api/ttlock/lock/details';
    return this.http.post<LockDetails>(url, body)
  }
  setAutoLock(token: string, lockID: number, seconds: number): Observable<operationResponse> {
    let body = {token, lockID, seconds}
    let url = 'http://localhost:3000/api/ttlock/lock/setAutoLock';
    return this.http.post<operationResponse>(url, body);
  }
  transferLock(token: string, receiverUsername: string, lockIdList: string): Observable<operationResponse> {
    let body = {token, receiverUsername, lockIdList}
    let url = 'http://localhost:3000/api/ttlock/lock/transfer';
    return this.http.post<operationResponse>(url, body);
  }
}
