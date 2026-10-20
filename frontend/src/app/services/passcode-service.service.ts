import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, Observable } from 'rxjs';
import { InvitationResponse, MultiplePasscodeResponse, PasscodeResponse, createPasscodeResponse, operationResponse } from '../Interfaces/API_responses';
import { Passcode } from '../Interfaces/Elements';
import { MatTableDataSource } from '@angular/material/table';
import { LockData } from '../Interfaces/Lock';

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
  currentLocks: LockData[] = []
  selectedLocks: { id: number, alias: string }[] = [];
  availableLocks: { id: number, alias: string }[] = [];

  constructor(private http: HttpClient) { }

  private getHeaders(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }

  getPasscodesofLock(accessToken: string, lockID: number): Observable<PasscodeResponse> {
    const url = this.URL.concat('/v0/passcode/getListLock');
    const body = { lockID };
    return this.http.post<PasscodeResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }

  async fetchPasscodes(lockId: number) {
    this.passcodes = [];
    try {
      const response = await lastValueFrom(
        this.getPasscodesofLock(this.userID, lockId)
      );
      const typedResponse = response as PasscodeResponse;
      if (typedResponse?.list) {
        this.passcodes = typedResponse.list;
      } else if (typedResponse.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Passcodes not available");
      }
    } catch (error) {
      console.error("Error while fetching passcodes:", error);
    } finally {
      this.passcodesDataSource = new MatTableDataSource(this.passcodes);
    }
  }
  multiplePasscodes(userID: string, passcodes: { name: string, tipo: number, code: string }[]): Observable<MultiplePasscodeResponse[]> {
    let body = { userID, passcodes, selectedLocks: this.selectedLocks }
    let url = this.URL.concat('/v0/passcode/multiplePasscodes');
    return this.http.post<MultiplePasscodeResponse[]>(url, body);
  }

  generatePasscode(userID: string, lockID: number, type: string, startDate: string, name?: string, endDate?: string): Observable<createPasscodeResponse> {
    let body = { userID, lockID, type, startDate, name, endDate };
    let url = this.URL.concat('/v0/passcode/get');
    console.log(body)
    return this.http.post<createPasscodeResponse>(url, body);
  }
  generateCustomPasscode(userID: string, lockID: number, keyboardPwd: string, keyboardPwdType: string, keyboardPwdName?: string, startDate?: string, endDate?: string): Observable<createPasscodeResponse> {
    let body = { userID, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate };
    console.log(body)
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
  toggleLock(lock: { id: number; alias: string }) {
    const index = this.selectedLocks.findIndex(l => l.id === lock.id);
    if (index !== -1) {
      this.selectedLocks.splice(index, 1); // uncheck
    } else {
      this.selectedLocks.push(lock); // check
    }
  }
  isLockSelected(lockId: number): boolean {
    return this.selectedLocks.some(l => l.id === lockId);
  }

  generateCustomPasscode2(
    userID: string,
    selectedLocks: { id: number; alias: string }[],
    keyboardPwd: string,
    keyboardPwdType: string,
    keyboardPwdName?: string,
    startDate?: string,
    endDate?: string,
    email?: string
  ): Observable<InvitationResponse> {
    let body = { userID, selectedLocks, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate, email };
    let url = this.URL.concat('/v0/passcode/add2');
    return this.http.post<InvitationResponse>(url, body);
  }


}
