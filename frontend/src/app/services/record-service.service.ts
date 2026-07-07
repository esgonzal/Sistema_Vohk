import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RecordResponse } from '../Interfaces/API_responses';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecordServiceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  private getHeaders(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }

  getRecords(accessToken: string, lockID: number, pageNo: number, pageSize: number): Observable<RecordResponse> {
    const url = this.URL.concat('/v0/record/getListLock');
    const body = { lockID, pageNo, pageSize };
    return this.http.post<RecordResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
}