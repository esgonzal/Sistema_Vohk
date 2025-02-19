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
  //URL = 'http://localhost:8080';
  userID = sessionStorage.getItem('user') ?? ''
  lockID: number = Number(sessionStorage.getItem('lockID') ?? '')
  fingerprints: Fingerprint[] = [];
  fingerprintsDataSource: MatTableDataSource<Fingerprint>;

  constructor(private http: HttpClient) { }

  async fetchFingerprints(lockId: number) {
    this.fingerprints = [];
    //this.isLoading = true;
    try {
      await this.fetchFingerprintsPage(1, lockId);
    } catch (error) {
      console.error("Error while fetching fingerprints:", error);
    } finally {
      this.fingerprintsDataSource = new MatTableDataSource(this.fingerprints);
      //console.log("Fingerprints: ", this.fingerprints)
      //this.isLoading = false;
    }
  }
  async fetchFingerprintsPage(pageNo: number, lockId: number) {
    //this.isLoading = true;
    try {
      const response = await lastValueFrom(this.getFingerprintsofLock(this.userID, lockId, pageNo, 100))
      const typedResponse = response as FingerprintResponse;
      if (typedResponse?.list) {
        this.fingerprints.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchFingerprintsPage(pageNo + 1, lockId);
        }
      } else if (typedResponse.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Fingerprints not yet available");
      }
    } catch (error) {
      console.error("Error while fetching fingerprints page:", error);
    } finally {
      //this.isLoading = false;
    }
  }

  getFingerprintsofLock(userID: string, lockID: number, pageNo: number, pageSize: number): Observable<FingerprintResponse> {
    let body = { userID, lockID, pageNo, pageSize };
    let url = this.URL.concat('/v0/fingerprint/getListLock');
    return this.http.post<FingerprintResponse>(url, body);
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
