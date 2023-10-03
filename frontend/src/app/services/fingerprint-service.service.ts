import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FingerprintResponse, operationResponse } from '../Interfaces/API_responses';

@Injectable({
  providedIn: 'root'
})
export class FingerprintServiceService {

  constructor(private http: HttpClient) { }

  getFingerprintsofLock(token: string, lockID: number, pageNo: number, pageSize: number): Observable<FingerprintResponse> {
    let body = { token, lockID, pageNo, pageSize };
    let url = 'http://localhost:3000/api/ttlock/fingerprint/getListLock';
    return this.http.post<FingerprintResponse>(url, body);
  }
  deleteFingerprint(token: string, lockID: number, fingerprintID: number): Observable<operationResponse> {
    let body = { token, lockID, fingerprintID };
    let url = 'http://localhost:3000/api/ttlock/fingerprint/delete';
    return this.http.post<operationResponse>(url, body);
  }
  changeName(token: string, lockID: number, fingerprintID: number, newName: string): Observable<operationResponse> {
    let body = { token, lockID, fingerprintID, newName };
    let url = 'http://localhost:3000/api/ttlock/fingerprint/rename';
    return this.http.post<operationResponse>(url, body);
  }
  changePeriod(token: string, lockID: number, fingerprintID: number, newStartDate: string, newEndDate: string): Observable<operationResponse> {
    let body = { token, lockID, fingerprintID, newStartDate, newEndDate };
    let url = 'http://localhost:3000/api/ttlock/fingerprint/changePeriod';
    return this.http.post<operationResponse>(url, body);
  }
}
