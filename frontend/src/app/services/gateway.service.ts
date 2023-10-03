import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GatewayAccountResponse, GatewayLockResponse, GetLockTimeResponse, operationResponse } from '../Interfaces/API_responses';

@Injectable({
  providedIn: 'root'
})
export class GatewayService {

  userID: string;
  lockID: number;

  constructor(private http: HttpClient) { }

  getGatewayListOfLock(userID: string, lockID: number): Observable<GatewayLockResponse> {
    let body = { userID, lockID }
    let url = 'http://localhost:3000/api/ttlock/gateway/getListLock';
    return this.http.post<GatewayLockResponse>(url, body)
  }
  getGatewaysAccount(userID: string, pageNo: number, pageSize: number): Observable<GatewayAccountResponse> {
    let body = { userID, pageNo, pageSize };
    let url = 'http://localhost:3000/api/ttlock/gateway/getListAccount';
    return this.http.post<GatewayAccountResponse>(url, body);
  }
  unlock(userID: string, lockID: number): Observable<operationResponse> {
    let body = { userID, lockID };
    let url = 'http://localhost:3000/api/ttlock/gateway/unlock';
    return this.http.post<operationResponse>(url, body);
  }
  lock(userID: string, lockID: number): Observable<operationResponse> {
    let body = { userID, lockID };
    let url = 'http://localhost:3000/api/ttlock/gateway/lock';
    return this.http.post<operationResponse>(url, body);
  }
  getLockTime(userID: string, lockID: number): Observable<GetLockTimeResponse> { 
    let body = { userID, lockID };
    let url = 'http://localhost:3000/api/ttlock/gateway/getTime';
    return this.http.post<GetLockTimeResponse>(url, body);
  }
  adjustLockTime(userID: string, lockID: number): Observable<GetLockTimeResponse> {
    let body = { userID, lockID };
    let url = 'http://localhost:3000/api/ttlock/gateway/getTime';
    return this.http.post<GetLockTimeResponse>(url, body);
  }
}
