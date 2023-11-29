import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PasscodeResponse, createPasscodeResponse, operationResponse } from '../Interfaces/API_responses';
import emailjs from 'emailjs-com';

@Injectable({
  providedIn: 'root'
})
export class PasscodeServiceService {

  URL = 'https://api.vohkapp.com';
  username: string;
  lockAlias: string;
  endDateUser: string;
  featureValue: string
  gateway: number;
  passcodesimple = false;
  userID: string;
  lockID: number;

  constructor(private http: HttpClient) { }

  getPasscodesofLock(userID: string, lockID: number, pageNo: number, pageSize: number): Observable<PasscodeResponse> {
    let body = { userID, lockID, pageNo, pageSize };
    let url = this.URL.concat('/v0/passcode/getListLock');
    return this.http.post<PasscodeResponse>(url, body);
  }
  generatePasscode(userID: string, lockID: number, type: string, startDate: string, name?: string, endDate?: string): Observable<createPasscodeResponse> {
    let body = { userID, lockID, type, startDate, name, endDate };
    let url = this.URL.concat('/v0/passcode/get');
    return this.http.post<createPasscodeResponse>(url, body);
  }
  generateCustomPasscode(userID: string, lockID: number, keyboardPwd: string, keyboardPwdType: string, keyboardPwdName?: string, startDate?: string, endDate?: string): Observable<createPasscodeResponse> {
    let body = { userID, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate };
    let url = this.URL.concat('/v0/passcode/add');
    return this.http.post<createPasscodeResponse>(url, body);
  }
  deletePasscode(userID: string, lockID: number, passcodeID: number): Observable<operationResponse> {
    let body = { userID, lockID, passcodeID };
    let url = this.URL.concat('/v0/passcode/delete');
    return this.http.post<operationResponse>(url, body);
  }
  changePasscode(userID: string, lockID: number, passcodeID: number, newName?: string, newPwd?: string, newStartDate?: string, newEndDate?: string): Observable<operationResponse> {
    let body = { userID, lockID, passcodeID, newName, newPwd, newStartDate, newEndDate };
    let url = this.URL.concat('/v0/passcode/change');
    return this.http.post<operationResponse>(url, body);
  }
  sendEmail_PermanentPasscode(recipientEmail: string, code: string) {//Template para passcode permanente
    //esteban.vohk+4@gmail.com
    emailjs.send('contact_service', 'PasscodePermanent', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Un código ha sido compartido contigo',
      to_name: recipientEmail,
      code: code,
      lock_alias: this.lockAlias
    }, 'VVC1yrpkN9n-1Dcc3')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  sendEmail_OneUsePasscode(recipientEmail: string, code: string) {//Template para passcode de un uso
    //esteban.vohk+4@gmail.com
    emailjs.send('contact_service', 'PasscodeOneUse', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Un código ha sido compartido contigo',
      to_name: recipientEmail,
      code: code,
      lock_alias: this.lockAlias
    }, 'VVC1yrpkN9n-1Dcc3')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  sendEmail_PeriodPasscode(recipientEmail: string, code: string, start: string, end: string) {//Template para passcode periodica
    //esteban.vohk+5@gmail.com
    emailjs.send('contact_service', 'PasscodePeriodica', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Un código ha sido compartido contigo',
      to_name: recipientEmail,
      code: code,
      lock_alias: this.lockAlias,
      start: start,
      end: end
    }, 'gmWCdpYwocA8wp4sr')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  sendEmail_ErasePasscode(recipientEmail: string, code: string) {//Template para passcode de borrar
    //esteban.vohk+5@gmail.com
    emailjs.send('contact_service', 'PasscodeBorrar', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Un código ha sido compartido contigo',
      to_name: recipientEmail,
      code: code,
      lock_alias: this.lockAlias
    }, 'gmWCdpYwocA8wp4sr')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
  sendEmail_RecurringPasscode(recipientEmail: string, code: string, start: string, end: string, tipo: number) {//Template para passcode recurrente
    //esteban.vohk+6@gmail.com
    let days = '';
    switch (tipo) {
      case 5:
        days = "Sábados y Domingos";
        break;
      case 6:
        days = "dias";
        break;
      case 7:
        days = "Lunes, Martes, Miercoles, Jueves y Viernes";
        break;
      case 8:
        days = "Lunes";
        break;
      case 9:
        days = "Martes";
        break;
      case 10:
        days = "Miercoles";
        break;
      case 11:
        days = "Jueves";
        break;
      case 12:
        days = "Viernes";
        break;
      case 13:
        days = "Sabados";
        break;
      case 14:
        days = "Domingos";
        break;
      default:
        days = '';
        break;
    }
    emailjs.send('contact_service', 'PasscodeDias', {
      to_email: recipientEmail,
      from_name: this.username,
      subject: 'Un código ha sido compartido contigo',
      to_name: recipientEmail,
      code: code,
      lock_alias: this.lockAlias,
      start: start,
      end: end,
      days: days
    }, 'bdNkCTZsViZUFZCL9')
      .then((response) => { console.log('Email sent successfully:', response); })
      .catch((error) => { console.error('Error sending email:', error); });
  }
}
