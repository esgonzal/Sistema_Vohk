import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GatewayAccountResponse, GatewayLockResponse, GetLockTimeResponse, operationResponse } from '../Interfaces/API_responses';
import { GatewayAccount } from '../Interfaces/Gateway';

@Injectable({
  providedIn: 'root'
})
export class GatewayService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';
  userID: string;
  lockID: number;
  gateways: GatewayAccount[];
  selectedHubs: { id: number }[] = [];

  constructor(private http: HttpClient) { }

  getGatewayListOfLock(userID: string, lockID: number): Observable<GatewayLockResponse> {
    let body = { userID, lockID }
    let url = this.URL.concat('/v0/gateway/getListLock');
    return this.http.post<GatewayLockResponse>(url, body)
  }
  getGatewaysAccount(userID: string, pageNo: number, pageSize: number): Observable<GatewayAccountResponse> {
    let body = { userID, pageNo, pageSize };
    let url = this.URL.concat('/v0/gateway/getListAccount');
    return this.http.post<GatewayAccountResponse>(url, body);
  }
  unlock(userID: string, lockID: number): Observable<operationResponse> {
    let body = { userID, lockID };
    let url = this.URL.concat('/v0/gateway/unlock');
    return this.http.post<operationResponse>(url, body);
  }
  lock(userID: string, lockID: number): Observable<operationResponse> {
    let body = { userID, lockID };
    let url = this.URL.concat('/v0/gateway/lock');
    return this.http.post<operationResponse>(url, body);
  }
  getLockTime(userID: string, lockID: number): Observable<GetLockTimeResponse> { 
    let body = { userID, lockID };
    let url = this.URL.concat('/v0/gateway/getTime');
    return this.http.post<GetLockTimeResponse>(url, body);
  }
  adjustLockTime(userID: string, lockID: number): Observable<GetLockTimeResponse> {
    let body = { userID, lockID };
    let url = this.URL.concat('/v0/gateway/getTime');
    return this.http.post<GetLockTimeResponse>(url, body);
  }
  transferGateway(userID: string, receiverUsername: string, gatewayID: string): Observable<operationResponse> {
    let body = {userID, receiverUsername, gatewayID}
    let url = this.URL.concat('/v0/gateway/transfer');
    return this.http.post<operationResponse>(url, body);
  }
}