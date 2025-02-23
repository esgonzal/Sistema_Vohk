import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, Observable } from 'rxjs';
import { PasscodeResponse, createPasscodeResponse, operationResponse } from '../Interfaces/API_responses';
import { Passcode } from '../Interfaces/Elements';
import { MatTableDataSource } from '@angular/material/table';

@Injectable({
  providedIn: 'root'
})
export class PasscodeServiceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';
  username: string;
  lockAlias: string;
  endDateUser: string;
  featureValue: string
  gateway: number;
  passcodesimple = false;
  userID = sessionStorage.getItem('user') ?? ''
  lockID: number = Number(sessionStorage.getItem('lockID') ?? '')
  passcodes: Passcode[] = [];
  passcodesDataSource: MatTableDataSource<Passcode>;

  constructor(private http: HttpClient) { }

  async fetchPasscodes(lockId: number) {
    this.passcodes = [];
    //this.isLoading = true;
    try {
      await this.fetchPasscodesPage(1, lockId);
    } catch (error) {
      console.error("Error while fetching passcodes:", error);
    } finally {
      //this.updatePasscodeUsage()
      this.passcodesDataSource = new MatTableDataSource(this.passcodes);
      //this.isLoading = false;
      //console.log("Passcodes: ", this.passcodes)
    }
  }
  async fetchPasscodesPage(pageNo: number, lockId: number) {
    //this.isLoading = true;
    try {
      const response = await lastValueFrom(this.getPasscodesofLock(this.userID, lockId, pageNo, 100))
      const typedResponse = response as PasscodeResponse;
      if (typedResponse?.list) {
        this.passcodes.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchPasscodesPage(pageNo + 1, lockId);
        }
      } else if (typedResponse.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Passcodes not yet available");
      }
    } catch (error) {
      console.error("Error while fetching passcodes page:", error);
    } finally {
      //this.isLoading = false;
    }
  }

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
  sendEmail(name: string, email: string, motivo: string, code: string, lock_alias: string, start: string, end: string): Observable<any> {
    let body = { name: name, email: email, motivo: motivo, code: code, lock_alias: lock_alias, start: start, end: end };
    let url = this.URL.concat('/v0/passcode/sendEmail');
    console.log("body: ", body)
    console.log("url: ", url)
    return this.http.post<any>(url, body);
  }

  sendEmail_passcodePermanent(to: string, from: string, lock_alias: string, code: string) {//Template para passcode permanente
    let body = { to, from, lock_alias, code };
    let url = this.URL.concat('/mail/passcodePermanent');
    return this.http.post(url, body)
  }
  sendEmail_passcodeOneTime(to: string, from: string, alias: string, code: string) {//Template para passcode de un uso
    let body = { to: to, from: from, lock_alias: alias, code: code };
    let url = this.URL.concat('/mail/passcodeOneTime');
    return this.http.post(url, body)
  }
  sendEmail_passcodePeriodic(to: string, from: string, alias: string, code: string, start: string, end: string) {//Template para passcode periodica
    let body = { to: to, from: from, lock_alias: alias, code: code, start: start, end: end };
    let url = this.URL.concat('/mail/passcodePeriodic');
    return this.http.post(url, body)
  }
  sendEmail_passcodeDelete(to: string, from: string, alias: string, code: string) {//Template para passcode de borrar
    let body = { to: to, from: from, lock_alias: alias, code: code };
    let url = this.URL.concat('/mail/passcodeDelete');
    return this.http.post(url, body)
  }
  sendEmail_passcodeDays(to: string, from: string, alias: string, code: string, start: string, end: string, tipo: number) {//Template para passcode recurrente
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
    let body = { to: to, from: from, lock_alias: alias, code: code, days: days, start: start, end: end };
    let url = this.URL.concat('/mail/passcodeDays');
    return this.http.post(url, body)
  }
}
