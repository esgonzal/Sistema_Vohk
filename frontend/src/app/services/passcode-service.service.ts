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
      const accessToken = sessionStorage.getItem('accessToken') ?? '';
      const response = await lastValueFrom(
        this.getPasscodesofLock(accessToken, lockId)
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
  multiplePasscodes(accessToken: string, passcodes: { name: string, tipo: number, code: string }[]): Observable<MultiplePasscodeResponse[]> {
    let body = { passcodes, selectedLocks: this.selectedLocks }
    let url = this.URL.concat('/v0/passcode/multiplePasscodes');
    return this.http.post<MultiplePasscodeResponse[]>(url, body, { headers: this.getHeaders(accessToken) });
  }

  generatePasscode(accessToken: string, lockID: number, type: string, startDate: string, name?: string, endDate?: string): Observable<createPasscodeResponse> {
    const body = { lockID, type, startDate, name, endDate };
    const url = this.URL.concat('/v0/passcode/get');
    return this.http.post<createPasscodeResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  generateCustomPasscode(accessToken: string, lockID: number, keyboardPwd: string, keyboardPwdType: string, keyboardPwdName?: string, startDate?: string, endDate?: string): Observable<createPasscodeResponse> {
    const body = { lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate };
    const url = this.URL.concat('/v0/passcode/add');
    return this.http.post<createPasscodeResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  deletePasscode(accessToken: string, lockID: number, passcodeID: number): Observable<operationResponse> {
    const body = { lockID, passcodeID };
    const url = this.URL.concat('/v0/passcode/delete');
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  changePasscode(accessToken: string, lockID: number, passcodeID: number, newName?: string, newCode?: string, newStartDate?: string, newEndDate?: string): Observable<operationResponse> {
    const body = { lockID, passcodeID, newName, newCode, newStartDate, newEndDate };
    const url = this.URL.concat('/v0/passcode/change');
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
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
