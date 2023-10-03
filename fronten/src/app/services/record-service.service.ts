import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RecordResponse } from '../Interfaces/API_responses';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecordServiceService {

  constructor(private http: HttpClient) { }

  getRecords(token: string, lockID: number, pageNo: number, pageSize: number): Observable<RecordResponse> {
   let body = {token, lockID, pageNo, pageSize};
   let url = 'http://localhost:3000/api/ttlock/record/getListLock'
   return this.http.post<RecordResponse>(url, body);
  }
}
