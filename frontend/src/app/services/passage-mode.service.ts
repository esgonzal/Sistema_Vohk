import { Injectable } from '@angular/core';
import { PassageMode } from '../Interfaces/PassageMode';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'
import { operationResponse } from '../Interfaces/API_responses';

@Injectable({
  providedIn: 'root'
})
export class PassageModeService {

  URL = 'https://api.vohkapp.com';
  //URL = 'http://localhost:8080';
  userID: string;
  lockID: number;
  passageModeConfig: PassageMode;

  constructor(private http: HttpClient) { }

  getPassageModeConfig(userID: string, lockID: number): Observable<PassageMode> {
    let body = { userID, lockID };
    let url = this.URL.concat('/v0/lock/getPassageMode');
    return this.http.post<PassageMode>(url, body);
  }
  setPassageMode(userID: string, lockID: number, passageMode:number, startDate: string, endDate:string, isAllDay:number, weekdays: number[]): Observable<operationResponse> {
    let weekDays = JSON.stringify(weekdays)
    let body = { userID, lockID, passageMode, startDate, endDate, isAllDay, weekDays};
    let url = this.URL.concat('/v0/lock/setPassageMode');
    return this.http.post<operationResponse>(url, body);
  }
}