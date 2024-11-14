import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EkeyResponse, operationResponse, sendEkeyResponse, LockListResponse, getByUserAndLockIdResponse } from '../Interfaces/API_responses';
import { LockData } from '../Interfaces/Lock';
import { RecipientList } from '../Interfaces/RecipientList';

@Injectable({
  providedIn: 'root'
})
export class EkeyServiceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';
  userID: string;
  lockID: number;
  username = sessionStorage.getItem('user') ?? ''
  lockAlias: string;
  endDateUser: string;
  currentLocks: LockData[] = []
  selectedLocks: { id: number, alias: string }[] = [];
  selectedEkeys: number[] = [];
  recipients: RecipientList[] = [];

  constructor(private http: HttpClient) { }

  getEkeysofAccount(userID: string, pageNo: number, pageSize: number, groupID?: number): Observable<LockListResponse> {
    let body = { userID, pageNo, pageSize, groupID };
    let url = this.URL.concat('/v0/ekey/list');
    return this.http.post<LockListResponse>(url, body);
  }
  getEkeysofLock(userID: string, lockID: number, pageNo: number, pageSize: number): Observable<EkeyResponse> {
    let body = { userID, lockID, pageNo, pageSize };
    let url = this.URL.concat('/v0/ekey/getListLock');
    return this.http.post<EkeyResponse>(url, body);
  }
  sendEkey(userID: string, lockID: number, lockAlias: string, recieverName: string, keyName: string, 
           startDate: string, endDate: string, keyRight: number, remoteEnable: number, email: string, 
           keyType?: number, startDay?: string, endDay?: string, weekDays?: string): Observable<sendEkeyResponse> {
    let body = { userID, lockID, lockAlias, recieverName, keyName, startDate, endDate, keyRight, remoteEnable, email, keyType, startDay, endDay, weekDays };
    let url = this.URL.concat('/v0/ekey/send');
    //console.log(body)
    return this.http.post<sendEkeyResponse>(url, body);
  }
  deleteEkey(userID: string, keyID: number, lockID: number, keyUsername: string): Observable<operationResponse> {
    let body = { userID, keyID, lockID, keyUsername };
    let url = this.URL.concat('/v0/ekey/delete');
    return this.http.post<operationResponse>(url, body);
  }
  freezeEkey(userID: string, keyID: number): Observable<operationResponse> {
    let body = { userID, keyID };
    let url = this.URL.concat('/v0/ekey/freeze');
    return this.http.post<operationResponse>(url, body);
  }
  unfreezeEkey(userID: string, keyID: number): Observable<operationResponse> {
    let body = { userID, keyID };
    let url = this.URL.concat('/v0/ekey/unfreeze');
    return this.http.post<operationResponse>(url, body);
  }
  modifyEkey(userID: string, keyID: number, newName?: string, remoteEnable?: string): Observable<operationResponse> {
    let body = { userID, keyID, newName, remoteEnable };
    let url = this.URL.concat('/v0/ekey/modify');
    return this.http.post<operationResponse>(url, body);
  }
  changePeriod(userID: string, keyID: number, newStartDate: string, newEndDate: string): Observable<operationResponse> {
    let body = { userID, keyID, newStartDate, newEndDate };
    let url = this.URL.concat('/v0/ekey/changePeriod');
    return this.http.post<operationResponse>(url, body);
  }
  AuthorizeEkey(userID: string, lockID: number, keyID: number): Observable<operationResponse> {
    let body = { userID, lockID, keyID };
    let url = this.URL.concat('/v0/ekey/authorize');
    return this.http.post<operationResponse>(url, body);
  }
  cancelAuthorizeEkey(userID: string, lockID: number, keyID: number): Observable<operationResponse> {
    let body = { userID, lockID, keyID };
    let url = this.URL.concat('/v0/ekey/unauthorize');
    return this.http.post<operationResponse>(url, body);
  }
  generateEmail(userID: string, lockAlias: string, recieverName: string, startDate: string, endDate: string, email?: string): Observable<sendEkeyResponse> {
    let body = {userID, lockAlias, recieverName, startDate, endDate, email}
    let url = this.URL.concat('/v0/ekey/generateEmail');
    return this.http.post<sendEkeyResponse>(url, body);
  }

  sendEmail(toEmail: string, emailContent: string): Observable<sendEkeyResponse> {
    let body = {toEmail, emailContent}
    let url = this.URL.concat('/mail/sendEmail');
    return this.http.post<sendEkeyResponse>(url, body);
  }
}