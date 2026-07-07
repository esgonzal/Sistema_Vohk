import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, Observable } from 'rxjs';
import { FingerprintResponse, operationResponse } from '../Interfaces/API_responses';
import { Fingerprint } from '../Interfaces/Elements';
import { MatTableDataSource } from '@angular/material/table';

@Injectable({
  providedIn: 'root'
})
export class FingerprintServiceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';
  userID = sessionStorage.getItem('user') ?? ''
  lockID: number = Number(sessionStorage.getItem('lockID') ?? '')
  fingerprints: Fingerprint[] = [];
  fingerprintsDataSource: MatTableDataSource<Fingerprint>;

  constructor(private http: HttpClient) { }

  private getHeaders(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }
  getFingerprintsofLock(accessToken: string, lockID: number): Observable<FingerprintResponse> {
    const url = this.URL.concat('/v0/fingerprint/getListLock');
    const body = { lockID };
    return this.http.post<FingerprintResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  deleteFingerprint(accessToken: string, lockID: number, fingerprintID: number): Observable<operationResponse> {
    const url = this.URL.concat('/v0/fingerprint/delete');
    const body = { lockID, fingerprintID }
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  changeName(accessToken: string, lockID: number, fingerprintID: number, newName: string): Observable<operationResponse> {
    const url = this.URL.concat('/v0/fingerprint/rename');
    const body = { lockID, fingerprintID, newName }
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  changePeriod(accessToken: string, lockID: number, fingerprintID: number, newStartDate: number, newEndDate: number): Observable<operationResponse> {
    const url = this.URL.concat('/v0/fingerprint/changePeriod');
    const body = { lockID, fingerprintID, newStartDate, newEndDate }
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
}
