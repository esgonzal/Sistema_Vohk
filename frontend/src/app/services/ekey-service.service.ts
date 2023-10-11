import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EkeyResponse, operationResponse, sendEkeyResponse, LockListResponse, getByUserAndLockIdResponse } from '../Interfaces/API_responses';
import { LockData } from '../Interfaces/Lock';
import { RecipientList } from '../Interfaces/RecipientList';
import emailjs from 'emailjs-com';

@Injectable({
  providedIn: 'root'
})
export class EkeyServiceService {

  userID: string;
  lockID: number;
  username = sessionStorage.getItem('user') ?? ''
  endDateUser: string;
  currentLocks: LockData[] = []
  selectedLocks: number[] = [];
  recipients: RecipientList[] = [];

  constructor(private http: HttpClient) { }

  getEkeysofAccount(userID: string, pageNo: number, pageSize: number, groupID?: number): Observable<LockListResponse> {
    let body = { userID, pageNo, pageSize, groupID };
    let url = 'http://localhost:3000/api/vohk/ekey/getListAccount';
    return this.http.post<LockListResponse>(url, body);
  }
  getEkeysofLock(userID: string, lockID: number, pageNo: number, pageSize: number): Observable<EkeyResponse> {
    let body = { userID, lockID, pageNo, pageSize };
    let url = 'http://localhost:3000/api/vohk/ekey/getListLock';
    return this.http.post<EkeyResponse>(url, body);
  }
  sendEkey(userID: string, lockID: number, recieverName: string, keyName: string, startDate: string, endDate: string, keyRight: number, keyType?: number, startDay?: string, endDay?: string, weekDays?: string): Observable<sendEkeyResponse> {
    let body = { userID, lockID, recieverName, keyName, startDate, endDate, keyRight, keyType, startDay, endDay, weekDays };
    let url = 'http://localhost:3000/api/vohk/ekey/send';
    return this.http.post<sendEkeyResponse>(url, body);
  }
  deleteEkey(userID: string, keyID: number, lockID: number, keyUsername: string): Observable<operationResponse> {
    let body = { userID, keyID, lockID, keyUsername };
    let url = 'http://localhost:3000/api/vohk/ekey/delete';
    return this.http.post<operationResponse>(url, body);
  }
  freezeEkey(userID: string, keyID: number): Observable<operationResponse> {
    let body = { userID, keyID };
    let url = 'http://localhost:3000/api/vohk/ekey/freeze';
    return this.http.post<operationResponse>(url, body);
  }
  unfreezeEkey(userID: string, keyID: number): Observable<operationResponse> {
    let body = { userID, keyID };
    let url = 'http://localhost:3000/api/vohk/ekey/unfreeze';
    return this.http.post<operationResponse>(url, body);
  }
  modifyEkey(userID: string, keyID: number, newName?: string, remoteEnable?: string): Observable<operationResponse> {
    let body = { userID, keyID, newName, remoteEnable };
    let url = 'http://localhost:3000/api/vohk/ekey/modify';
    return this.http.post<operationResponse>(url, body);
  }
  changePeriod(userID: string, keyID: number, newStartDate: string, newEndDate: string): Observable<operationResponse> {
    let body = { userID, keyID, newStartDate, newEndDate };
    let url = 'http://localhost:3000/api/vohk/ekey/changePeriod';
    return this.http.post<operationResponse>(url, body);
  }
  AuthorizeEkey(userID: string, lockID: number, keyID: number): Observable<operationResponse> {
    let body = { userID, lockID, keyID };
    let url = 'http://localhost:3000/api/vohk/ekey/authorize';
    return this.http.post<operationResponse>(url, body);
  }
  cancelAuthorizeEkey(userID: string, lockID: number, keyID: number): Observable<operationResponse> {
    let body = { userID, lockID, keyID };
    let url = 'http://localhost:3000/api/vohk/ekey/unauthorize';
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
    let url = `http://localhost:3000/api/DB/ekeys/getByUserAndLockId?accountName=${accountName}&lockId=${lockID}`;
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    let options = { headers };
    return this.http.get<getByUserAndLockIdResponse>(url, options);
  }
  changeIsUser(accountName: string, lockId: number, isUser: boolean) {
    console.log("variables en ekeyService:",accountName,lockId,isUser)
    let url = 'http://localhost:3000/api/DB/ekeys/changeIsUser';
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
    let url = `http://localhost:3000/api/DB/ekeys/delete?accountName=${accountName}&lockId=${lockId}`;
    return this.http.delete(url)
  }
  async sendEmail_permanentEkey(recipientEmail: string, keyName: string, alias:string) {//Template para eKey permanente a una cuenta existente
    //esteban.vohk@gmail.com
    emailjs.send('contact_service', 'SendEkeyPermanent', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey permanente ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: alias,
      ekey_name: keyName
    }, 'IHg0KzBkt_UoFb1yg')
      .then((response) => { console.log('Email sent successfully to', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_periodicEkey(recipientEmail: string, keyName: string, start: string, end: string, alias:string) {//Template para eKey periodica a una cuenta existente
    //esteban.vohk@gmail.com
    emailjs.send('contact_service', 'SendEkeyPeriodic', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey temporal ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: alias,
      ekey_name: keyName,
      start: start,
      end: end
    }, 'IHg0KzBkt_UoFb1yg')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_oneTimeEkey(recipientEmail: string, keyName: string, alias:string) {//Template para eKey de un uso a una cuenta existente
    //esteban.vohk+1@gmail.com
    emailjs.send('contact_service', 'SendEkeyOneTime', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey de un uso ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: alias,
      ekey_name: keyName
    }, 'JGXYy0TqnFt_IB5f4')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_solicitanteEkey(recipientEmail: string, keyName: string, weekDays: string, start: string, end: string, alias:string) {//Template para eKey solicitante a una cuenta existente
    //esteban.vohk+1@gmail.com
    emailjs.send('contact_service', 'SendEkeySolicitante', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey cíclica ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: alias,
      ekey_name: keyName,
      week_days: weekDays,
      start: start,
      end: end
    }, 'JGXYy0TqnFt_IB5f4')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_permanentEkey_newAccount(recipientEmail: string, keyName: string, password: string, alias:string) {//Template para eKey permanente a una cuenta nueva
    //esteban.vohk+2@gmail.com
    emailjs.send('contact_service', 'SendEkeyPermanentNewUser', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey permanente ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: alias,
      password: password,
      ekey_name: keyName
    }, '8Q0_n1lg4twgrBlaf')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_periodicEkey_newAccount(recipientEmail: string, keyName: string, start: string, end: string, password: string, alias:string) {//Template para eKey periodica a una cuenta nueva
    //esteban.vohk+2@gmail.com
    emailjs.send('contact_service', 'SendEkeyPeriodicNewUser', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey temporal ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: alias,
      password: password,
      ekey_name: keyName,
      start: start,
      end: end
    }, '8Q0_n1lg4twgrBlaf')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_oneTimeEkey_newAccount(recipientEmail: string, keyName: string, password: string, alias:string) {//Template para eKey de un uso a una cuenta nueva
    //esteban.vohk+3@gmail.com
    emailjs.send('contact_service', 'SendEkeyOneTimeNewUser', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey de un uso ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: alias,
      password: password,
      ekey_name: keyName
    }, 'ENb99SX5j4gqE1TFZ')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  async sendEmail_solicitanteEkey_newAccount(recipientEmail: string, keyName: string, weekDays: string, start: string, end: string, password: string, alias:string) {//Template para eKey solicitante a una cuenta nueva
    //esteban.vohk+3@gmail.com
    emailjs.send('contact_service', 'SendEkeySolicitanteNewUs', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Una eKey cíclica ha sido compartida contigo',
      to_name: recipientEmail,
      lock_alias: alias,
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
