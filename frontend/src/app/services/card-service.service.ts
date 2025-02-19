import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, Observable } from 'rxjs';
import { CardResponse, operationResponse } from '../Interfaces/API_responses';
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

  async fetchCards(lockId: number) {
    this.cards = [];
    //this.isLoading = true;
    try {
      await this.fetchCardsPage(1, lockId);
    } catch (error) {
      console.error("Error while fetching cards:", error);
    } finally {
      this.cardsDataSource = new MatTableDataSource(this.cards);
      //console.log("Cards: ", this.cards)
      //this.isLoading = false;
    }
  }
  async fetchCardsPage(pageNo: number, lockId: number) {
    //this.isLoading = true;
    try {
      const response = await lastValueFrom(this.getCardsofLock(this.userID, lockId, pageNo, 100))
      const typedResponse = response as CardResponse;
      if (typedResponse?.list) {
        this.cards.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchCardsPage(pageNo + 1, lockId);
        }
      } else if (typedResponse.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log("Cards not yet available");
      }
    } catch (error) {
      console.error("Error while fetching cards page:", error);
    } finally {
      //this.isLoading = false;
    }
  }

  getCardsofLock(userID: string, lockID: number, pageNo: number, pageSize: number): Observable<CardResponse> {
    let body = { userID, lockID, pageNo, pageSize };
    let url = this.URL.concat('/v0/card/getListLock');
    return this.http.post<CardResponse>(url, body);
  }
  addCard(userID: string, lockID: number, cardNumber: string, cardName: string, startDate: string, endDate: string): Observable<operationResponse> {
    let body = { userID, lockID, cardNumber, cardName, startDate, endDate };
    let url = this.URL.concat('/v0/card/add');
    return this.http.post<operationResponse>(url, body);
  }
  changeName(userID: string, lockID: number, cardID: number, newName: string): Observable<operationResponse> {
    let body = { userID, lockID, cardID, newName };
    let url = this.URL.concat('/v0/card/rename');
    return this.http.post<operationResponse>(url, body);
  }
  deleteCard(userID: string, lockID: number, cardID: number): Observable<operationResponse> {
    let body = { userID, lockID, cardID };
    let url = this.URL.concat('/v0/card/delete');
    return this.http.post<operationResponse>(url, body);
  }
  changePeriod(userID: string, lockID: number, cardID: number, newStartDate: string, newEndDate: string): Observable<operationResponse> {
    let body = { userID, lockID, cardID, newStartDate, newEndDate };
    let url = this.URL.concat('/v0/card/changePeriod');
    return this.http.post<operationResponse>(url, body);
  }
}