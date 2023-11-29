import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RecordResponse } from '../Interfaces/API_responses';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecordServiceService {

  URL = 'https://api.vohkapp.com';

  constructor(private http: HttpClient) { }

  getRecords(userID: string, lockID: number, pageNo: number, pageSize: number): Observable<RecordResponse> {
   let body = {userID, lockID, pageNo, pageSize};
   let url = this.URL.concat('/v0/record/getListLock');
   return this.http.post<RecordResponse>(url, body);
  }
}