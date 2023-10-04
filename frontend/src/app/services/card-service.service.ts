import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CardResponse, operationResponse } from '../Interfaces/API_responses';

@Injectable({
  providedIn: 'root'
})
export class CardServiceService {

  constructor(private http: HttpClient) { }

  getCardsofLock(userID: string, lockID: number, pageNo: number, pageSize: number): Observable<CardResponse> {
    let body = { userID, lockID, pageNo, pageSize };
    let url = 'http://localhost:3000/api/ttlock/card/getListLock'
    return this.http.post<CardResponse>(url, body);
  }
  changeName(userID: string, lockID: number, cardID: number, newName: string): Observable<operationResponse> {
    let body = { userID, lockID, cardID, newName };
    let url = 'http://localhost:3000/api/ttlock/card/rename';
    return this.http.post<operationResponse>(url, body);
  }
  deleteCard(userID: string, lockID: number, cardID: number): Observable<operationResponse> {
    let body = { userID, lockID, cardID };
    let url = 'http://localhost:3000/api/ttlock/card/delete';
    return this.http.post<operationResponse>(url, body);
  }
  changePeriod(userID: string, lockID: number, cardID: number, newStartDate: string, newEndDate: string): Observable<operationResponse> {
    let body = { userID, lockID, cardID, newStartDate, newEndDate };
    let url = 'http://localhost:3000/api/ttlock/card/changePeriod';
    return this.http.post<operationResponse>(url, body);
  }
}
