import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GatewayAccountResponse, GatewayLockResponse, GetLockTimeResponse, operationResponse } from '../Interfaces/API_responses';

@Injectable({
  providedIn: 'root'
})
export class GatewayService {

  token: string;
  lockID: number;

  constructor(private http: HttpClient) { }

  getGatewayListOfLock(token: string, lockID: number): Observable<GatewayLockResponse> {
    let body = { token, lockID }
    let url = 'http://localhost:3000/api/ttlock/gateway/getListLock';
    return this.http.post<GatewayLockResponse>(url, body)
  }
  getGatewaysAccount(token: string, pageNo: number, pageSize: number): Observable<GatewayAccountResponse> {
    let body = { token, pageNo, pageSize };
    let url = 'http://localhost:3000/api/ttlock/gateway/getListAccount';
    return this.http.post<GatewayAccountResponse>(url, body);
  }
  unlock(token: string, lockID: number): Observable<operationResponse> {
    let body = { token, lockID };
    let url = 'http://localhost:3000/api/ttlock/gateway/unlock';
    return this.http.post<operationResponse>(url, body);
  }
  lock(token: string, lockID: number): Observable<operationResponse> {
    let body = { token, lockID };
    let url = 'http://localhost:3000/api/ttlock/gateway/lock';
    return this.http.post<operationResponse>(url, body);
  }
  getLockTime(token: string, lockID: number): Observable<GetLockTimeResponse> { 
    let body = { token, lockID };
    let url = 'http://localhost:3000/api/ttlock/gateway/getTime';
    return this.http.post<GetLockTimeResponse>(url, body);
  }
  adjustLockTime(token: string, lockID: number): Observable<GetLockTimeResponse> {
    let body = { token, lockID };
    let url = 'http://localhost:3000/api/ttlock/gateway/getTime';
    return this.http.post<GetLockTimeResponse>(url, body);
  }
}
