import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, Observable } from 'rxjs';
import { EkeyResponse, operationResponse, sendEkeyResponse, LockListResponse } from '../Interfaces/API_responses';
import { LockData } from '../Interfaces/Lock';
import { RecipientList } from '../Interfaces/RecipientList';
import { Ekey } from '../Interfaces/Elements';
import { MatTableDataSource } from '@angular/material/table';
import { SelectedLock } from '../Interfaces/SelectedLock';
import { MultipleReceiver } from '../Interfaces/MultipleReceiver';

@Injectable({
  providedIn: 'root'
})
export class EkeyServiceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';
  userID = sessionStorage.getItem('user') ?? ''
  lockID: number;
  username = sessionStorage.getItem('user') ?? ''
  lockAlias: string;
  endDateUser: string;
  currentLocks: LockData[] = []
  selectedLocks: { id: number, alias: string }[] = [];
  selectedEkeys: number[] = [];
  recipients: RecipientList[] = [];
  ekeys: Ekey[] = [];
  ekeysDataSource: MatTableDataSource<Ekey>;
  locksOfGroup: LockData[] = [];

  constructor(private http: HttpClient) { }

  private getHeaders(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }

  getEkeysofAccount(accessToken: string, groupID: number): Observable<LockListResponse> {
    const url = this.URL.concat('/v0/ekey/list');
    const body = { groupID };
    return this.http.post<LockListResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }

  getEkeysofLock(accessToken: string, lockID: number): Observable<EkeyResponse> {
    const url = this.URL.concat('/v0/ekey/getListLock');
    const body = { lockID };
    return this.http.post<EkeyResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  sendMany(accessToken: string, locks: SelectedLock[], receiverName: string, keyName: string, startDate: string, endDate: string, keyRight: number, remoteEnable: number, notifyEmail: boolean, email: string) {
    const url = this.URL.concat('/v0/ekey/sendMany');
    const body = { locks, receiverName, keyName, startDate, endDate, keyRight, remoteEnable, notifyEmail, email };
    return this.http.post(url, body, { headers: this.getHeaders(accessToken) });
  }
  sendMultiple(accessToken: string, locks: SelectedLock[], receivers: MultipleReceiver[], startDate: string, endDate: string, keyRight: number, remoteEnable: number, notifyEmail: boolean) {
    const url = this.URL.concat('/v0/ekey/sendMultiple');
    const body = { locks, receivers, startDate, endDate, keyRight, remoteEnable, notifyEmail };
    return this.http.post(url, body, { headers: this.getHeaders(accessToken) });
  }


  sendEkey(userID: string, lockID: number, lockAlias: string, receiverName: string, keyName: string,
    startDate: string, endDate: string, keyRight: number, remoteEnable: number, email: string,
    keyType?: number, startDay?: string, endDay?: string, weekDays?: string): Observable<sendEkeyResponse> {
    let body = { userID, lockID, lockAlias, receiverName, keyName, startDate, endDate, keyRight, remoteEnable, email, keyType, startDay, endDay, weekDays };
    let url = this.URL.concat('/v0/ekey/send');
    //console.log(body)
    return this.http.post<sendEkeyResponse>(url, body);
  }
  sendEkey2(
    userID: string,
    selectedLocks: { id: number; alias: string }[],
    recieverName: string,
    keyName: string,
    startDate: string,
    endDate: string,
    keyRight: number,
    remoteEnable: number,
    email: string) {
    let body = { userID, selectedLocks, recieverName, keyName, startDate, endDate, keyRight, remoteEnable, email };
    let url = this.URL.concat('/v0/ekey/send2');
    return this.http.post(url, body);
  }
  deleteEkey(accessToken: string, keyID: number): Observable<operationResponse> {
    const url = this.URL.concat('/v0/ekey/delete');
    const body = { keyID };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  freezeEkey(accessToken: string, keyID: number): Observable<operationResponse> {
    const url = this.URL.concat('/v0/ekey/freeze');
    const body = { keyID };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  unfreezeEkey(accessToken: string, keyID: number): Observable<operationResponse> {
    const body = { keyID };
    const url = this.URL.concat('/v0/ekey/unfreeze');
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  modifyEkey(accessToken: string, keyID: number, newName?: string): Observable<operationResponse> {
    const body = { keyID, newName };
    const url = this.URL.concat('/v0/ekey/modify');
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  changePeriod(accessToken: string, keyID: number, newStartDate: number, newEndDate: number): Observable<operationResponse> {
    const body = { keyID, newStartDate, newEndDate };
    const url = this.URL.concat('/v0/ekey/changePeriod');
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  AuthorizeEkey(accessToken: string, lockID: number, keyID: number): Observable<operationResponse> {
    const url = this.URL.concat('/v0/ekey/authorize');
    const body = { lockID, keyID };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  cancelAuthorizeEkey(accessToken: string, lockID: number, keyID: number): Observable<operationResponse> {
    const url = this.URL.concat('/v0/ekey/unauthorize');
    const body = { lockID, keyID };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  generateEmail(userID: string, lockAlias: string, recieverName: string, startDate: string, endDate: string, email?: string): Observable<sendEkeyResponse> {
    console.log("generar email");
    let body = { userID, lockAlias, recieverName, startDate, endDate, email }
    let url = this.URL.concat('/v0/ekey/generateEmail');
    return this.http.post<sendEkeyResponse>(url, body);
  }
  generateEmail2(userID: string, lockAlias: string, recieverName: string, code: string, email: string): Observable<sendEkeyResponse> {
    let body = { userID, lockAlias, recieverName, code, email };
    let url = this.URL.concat('/v0/ekey/generateEmail2');
    return this.http.post<sendEkeyResponse>(url, body);
  }
  sendEmail(toEmail: string, emailContent: string): Observable<sendEkeyResponse> {
    console.log("enviar email");
    let body = { toEmail, emailContent }
    let url = this.URL.concat('/mail/sendEmail');
    return this.http.post<sendEkeyResponse>(url, body);
  }
}