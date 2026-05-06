import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RecordResponse } from '../Interfaces/API_responses';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecordServiceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8081';

  constructor(private http: HttpClient) { }

  getRecords(userID: string, lockID: number, startDate?: number, endDate?: number, recordType?: string): Observable<RecordResponse> {
    const body = { userID, lockID, startDate, endDate, recordType };
    return this.http.post<RecordResponse>(this.URL + '/v0/record/getListLock', body);
  }
}