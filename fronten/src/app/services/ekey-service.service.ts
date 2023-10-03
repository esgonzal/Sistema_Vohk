import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, lastValueFrom } from 'rxjs';
import { EkeyResponse, operationResponse, sendEkeyResponse, LockListResponse, getByUserAndLockIdResponse } from '../Interfaces/API_responses';
import { LockData } from '../Interfaces/Lock';
import { RecipientList } from '../Interfaces/RecipientList';
import emailjs from 'emailjs-com';

@Injectable({
  providedIn: 'root'
})
export class EkeyServiceService {

  token: string;
  username = sessionStorage.getItem('user') ?? ''
  lockAlias = sessionStorage.getItem('Alias') ?? ''
  lockID: number;
  endDateUser: string;
  currentLocks: LockData[] = []
  selectedLocks: number[] = [];
  recipients: RecipientList[] = [];
  ekeysimple = false;

  constructor(private http: HttpClient) { }

  getEkeysofAccount(token: string, pageNo: number, pageSize: number, groupId?: number): Observable<LockListResponse> {
    let body = { token, pageNo, pageSize, groupId };
    let url = 'http://localhost:3000/api/ttlock/ekey/getListAccount';
    return this.http.post<LockListResponse>(url, body);
  }
  getEkeysofLock(token: string, lockID: number, pageNo: number, pageSize: number): Observable<EkeyResponse> {
    let body = { token, lockID, pageNo, pageSize };
    let url = 'http://localhost:3000/api/ttlock/ekey/getListLock';
    return this.http.post<EkeyResponse>(url, body);
  }
  sendEkey(token: string, lockID: number, recieverName: string, keyName: string, startDate: string, endDate: string, keyRight: number, keyType?: number, startDay?: string, endDay?: string, weekDays?: string): Observable<sendEkeyResponse> {
    let body = { token, lockID, recieverName, keyName, startDate, endDate, keyRight, keyType, startDay, endDay, weekDays };
    let url = 'http://localhost:3000/api/ttlock/ekey/send';
    return this.http.post<sendEkeyResponse>(url, body);
  }
  deleteEkey(token: string, keyID: number): Observable<operationResponse> {
    let body = { token, keyID };
    let url = 'http://localhost:3000/api/ttlock/ekey/delete';
    return this.http.post<operationResponse>(url, body);
  }
  freezeEkey(token: string, keyID: number): Observable<operationResponse> {
    let body = { token, keyID };
    let url = 'http://localhost:3000/api/ttlock/ekey/freeze';
    return this.http.post<operationResponse>(url, body);
  }
  unfreezeEkey(token: string, keyID: number): Observable<operationResponse> {
    let body = { token, keyID };
    let url = 'http://localhost:3000/api/ttlock/ekey/unfreeze';
    return this.http.post<operationResponse>(url, body);
  }
  modifyEkey(token: string, keyID: number, newName?: string, remoteEnable?: string): Observable<operationResponse> {
    let body = { token, keyID, newName, remoteEnable };
    let url = 'http://localhost:3000/api/ttlock/ekey/modify';
    return this.http.post<operationResponse>(url, body);
  }
  changePeriod(token: string, keyID: number, newStartDate: string, newEndDate: string): Observable<operationResponse> {
    let body = { token, keyID, newStartDate, newEndDate };
    let url = 'http://localhost:3000/api/ttlock/ekey/changePeriod';
    return this.http.post<operationResponse>(url, body);
  }
  AuthorizeEkey(token: string, lockID: number, keyID: number): Observable<operationResponse> {
    let body = { token, lockID, keyID };
    let url = 'http://localhost:3000/api/ttlock/ekey/authorize';
    return this.http.post<operationResponse>(url, body);
  }
  cancelAuthorizeEkey(token: string, lockID: number, keyID: number): Observable<operationResponse> {
    let body = { token, lockID, keyID };
    let url = 'http://localhost:3000/api/ttlock/ekey/unauthorize';
    return this.http.post<operationResponse>(url, body);
  }
  createEkeyDB(accountName: string, lockId: number, isUser: boolean){
    let url = 'http://localhost:3000/api/ekeys/create';
    let body = {
      accountName,
      lockId,
      isUser
    }
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    let options = { headers };
    return this.http.post(url, body, options)
  }
  getIsUser(accountName: string, lockID: number): Observable<getByUserAndLockIdResponse> {
    let url = `http://localhost:3000/api/ekeys/getByUserAndLockId?accountName=${accountName}&lockId=${lockID}`;
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    let options = { headers };
    return this.http.get<getByUserAndLockIdResponse>(url, options);
  }
  changeIsUser(accountName: string, lockId: number, isUser: boolean) {
    console.log("variables en ekeyService:",accountName,lockId,isUser)
    let url = 'http://localhost:3000/api/ekeys/changeIsUser';
    let body = {
      accountName,
      lockId,
      isUser
    };
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    let options = { headers };
    return this.http.put(url, body, options);
  }
  deleteEkeyDB(accountName: string, lockId: number) {
    let url = `http://localhost:3000/api/ekeys/delete?accountName=${accountName}&lockId=${lockId}`;
    return this.http.delete(url)
  }


  async sendEmail_permanentEkey(recipientEmail: string, keyName: string) {//Template para eKey permanente a una cuenta existente
    //esteban.vohk@gmail.com
    emailjs.send('contact_service', 'SendEkeyPermanent', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey permanente ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: this.lockAlias,
      ekey_name: keyName
    }, 'IHg0KzBkt_UoFb1yg')
      .then((response) => { console.log('Email sent successfully to', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_periodicEkey(recipientEmail: string, keyName: string, start: string, end: string) {//Template para eKey periodica a una cuenta existente
    //esteban.vohk@gmail.com
    emailjs.send('contact_service', 'SendEkeyPeriodic', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey temporal ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: this.lockAlias,
      ekey_name: keyName,
      start: start,
      end: end
    }, 'IHg0KzBkt_UoFb1yg')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_oneTimeEkey(recipientEmail: string, keyName: string) {//Template para eKey de un uso a una cuenta existente
    //esteban.vohk+1@gmail.com
    emailjs.send('contact_service', 'SendEkeyOneTime', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey de un uso ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: this.lockAlias,
      ekey_name: keyName
    }, 'JGXYy0TqnFt_IB5f4')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_solicitanteEkey(recipientEmail: string, keyName: string, weekDays: string, start: string, end: string) {//Template para eKey solicitante a una cuenta existente
    //esteban.vohk+1@gmail.com
    emailjs.send('contact_service', 'SendEkeySolicitante', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey cíclica ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: this.lockAlias,
      ekey_name: keyName,
      week_days: weekDays,
      start: start,
      end: end
    }, 'JGXYy0TqnFt_IB5f4')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_permanentEkey_newAccount(recipientEmail: string, keyName: string, password: string) {//Template para eKey permanente a una cuenta nueva
    //esteban.vohk+2@gmail.com
    emailjs.send('contact_service', 'SendEkeyPermanentNewUser', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey permanente ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: this.lockAlias,
      password: password,
      ekey_name: keyName
    }, '8Q0_n1lg4twgrBlaf')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_periodicEkey_newAccount(recipientEmail: string, keyName: string, start: string, end: string, password: string) {//Template para eKey periodica a una cuenta nueva
    //esteban.vohk+2@gmail.com
    emailjs.send('contact_service', 'SendEkeyPeriodicNewUser', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey temporal ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: this.lockAlias,
      password: password,
      ekey_name: keyName,
      start: start,
      end: end
    }, '8Q0_n1lg4twgrBlaf')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_oneTimeEkey_newAccount(recipientEmail: string, keyName: string, password: string) {//Template para eKey de un uso a una cuenta nueva
    //esteban.vohk+3@gmail.com
    emailjs.send('contact_service', 'SendEkeyOneTimeNewUser', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey de un uso ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: this.lockAlias,
      password: password,
      ekey_name: keyName
    }, 'ENb99SX5j4gqE1TFZ')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_solicitanteEkey_newAccount(recipientEmail: string, keyName: string, weekDays: string, start: string, end: string, password: string) {//Template para eKey solicitante a una cuenta nueva
    //esteban.vohk+3@gmail.com
    emailjs.send('contact_service', 'SendEkeySolicitanteNewUs', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey cíclica ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: this.lockAlias,
      password: password,
      ekey_name: keyName,
      week_days: weekDays,
      start: start,
      end: end
    }, 'ENb99SX5j4gqE1TFZ')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
}
