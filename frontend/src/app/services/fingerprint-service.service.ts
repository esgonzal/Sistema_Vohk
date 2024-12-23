import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FingerprintResponse, operationResponse } from '../Interfaces/API_responses';

@Injectable({
  providedIn: 'root'
})
export class FingerprintServiceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

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
