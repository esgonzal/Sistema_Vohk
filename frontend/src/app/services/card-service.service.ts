import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, Observable } from 'rxjs';
import { CardResponse, CardResult, MultipleCardResponse, operationResponse } from '../Interfaces/API_responses';
import { Card } from '../Interfaces/Elements';
import { MatTableDataSource } from '@angular/material/table';

@Injectable({
  providedIn: 'root'
})
export class CardServiceService {

  URL = 'https://api.vohk.cl';
  //URL = 'http://localhost:8080';
  userID = sessionStorage.getItem('user') ?? ''
  lockID: number = Number(sessionStorage.getItem('lockID') ?? '')
  lockAlias: string;
  endDateUser: string;
  gateway: number;
  cardNumber: string;
  cards: Card[] = [];
  cardsDataSource: MatTableDataSource<Card>;

  constructor(private http: HttpClient) { }

  async fetchCards(lockID: number) {
    this.cards = [];
    try {
      const response = await lastValueFrom(
        this.getCardsofLock(this.userID, lockID)
      );
      const typedResponse = response as CardResponse;
      if (typedResponse?.list) {
        this.cards = typedResponse.list;
      } else if (typedResponse.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Cards not available");
      }
    } catch (error) {
      console.error("Error while fetching cards:", error);
    } finally {
      this.cardsDataSource = new MatTableDataSource(this.cards);
    }
  }

  private getHeaders(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }
  getCardsofLock(accessToken: string, lockID: number): Observable<CardResponse> {
    const url = this.URL.concat('/v0/card/getListLock');
    const body = { lockID };
    return this.http.post<CardResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  addCard(userID: string, lockID: number, cardNumber: string, cardName: string, startDate: string, endDate: string): Observable<operationResponse> {
    let body = { userID, lockID, cardNumber, cardName, startDate, endDate };
    let url = this.URL.concat('/v0/card/add');
    return this.http.post<operationResponse>(url, body);
  }
  changeName(accessToken: string, lockID: number, cardID: number, newName: string): Observable<operationResponse> {
    const url = this.URL.concat('/v0/card/rename');
    const body = { lockID, cardID, newName };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  deleteCard(accessToken: string, lockID: number, cardID: number): Observable<operationResponse> {
    const url = this.URL.concat('/v0/card/delete');
    const body = { lockID, cardID };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  changePeriod(accessToken: string, lockID: number, cardID: number, newStartDate: number, newEndDate: number): Observable<operationResponse> {
    const url = this.URL.concat('/v0/card/changePeriod');
    const body = { lockID, cardID, newStartDate, newEndDate };
    return this.http.post<operationResponse>(url, body, { headers: this.getHeaders(accessToken) });
  }
  multipleCards(userID: string, lockID: number, cards: { name: string, tipo: number, number: string }[]): Observable<CardResult[]> {
    let body = { userID, lockID, cards }
    let url = this.URL.concat('/v0/card/multipleCards');
    return this.http.post<CardResult[]>(url, body);
  }
}