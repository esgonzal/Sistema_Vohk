import { HttpClient } from '@angular/common/http';
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
  //URL = 'http://localhost:8081';
  userID = sessionStorage.getItem('user') ?? ''
  lockID: number = Number(sessionStorage.getItem('lockID') ?? '')
  fingerprints: Fingerprint[] = [];
  fingerprintsDataSource: MatTableDataSource<Fingerprint>;

  constructor(private http: HttpClient) { }

  async fetchFingerprints(lockId: number) {
    this.fingerprints = [];
    try {
      const response = await lastValueFrom(
        this.getFingerprintsofLock(this.userID, lockId)
      );
      const typedResponse = response as FingerprintResponse;
      if (typedResponse?.list) {
        this.fingerprints = typedResponse.list;
      } else if (typedResponse.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Fingerprints not available");
      }
    } catch (error) {
      console.error("Error while fetching fingerprints:", error);
    } finally {
      this.fingerprintsDataSource = new MatTableDataSource(this.fingerprints);
    }
  }
  getFingerprintsofLock(userID: string, lockID: number): Observable<FingerprintResponse> {
    let body = { userID, lockID };
    return this.http.post<FingerprintResponse>(this.URL + '/v0/fingerprint/getListLock', body);
  }
  deleteFingerprint(userID: string, lockID: number, fingerprintID: number): Observable<operationResponse> {
    let body = { userID, lockID, fingerprintID };
    let url = this.URL.concat('/v0/fingerprint/delete');
    return this.http.post<operationResponse>(url, body);
  }
  changeName(userID: string, lockID: number, fingerprintID: number, newName: string): Observable<operationResponse> {
    let body = { userID, lockID, fingerprintID, newName };
    let url = this.URL.concat('/v0/fingerprint/rename');
    return this.http.post<operationResponse>(url, body);
  }
  changePeriod(userID: string, lockID: number, fingerprintID: number, newStartDate: string, newEndDate: string): Observable<operationResponse> {
    let body = { userID, lockID, fingerprintID, newStartDate, newEndDate };
    let url = this.URL.concat('/v0/fingerprint/changePeriod');
    return this.http.post<operationResponse>(url, body);
  }
}
