import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CardServiceService } from 'src/app/services/card-service.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import moment from 'moment';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { lastValueFrom } from 'rxjs';
import { addCardResponse } from 'src/app/Interfaces/API_responses';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent {

  constructor(public cardService: CardServiceService,
    private router: Router,
    public popupService: PopUpService,
    private lockService: LockServiceService) {
    if (!this.cardService.userID || !this.cardService.lockID || !this.cardService.endDateUser) {
      this.router.navigate(['users', sessionStorage.getItem('user'), 'lock', sessionStorage.getItem('lockID')])
    }
  }

  isLoading: boolean = false;
  error = '';
  cardName: string = '';
  startDate: Date | null = null;
  startHour: string = '';
  endDate: Date | null = null;
  endHour: string = '';
  selectedType = '';
  onSelected(value: string): void { this.selectedType = value }

  createCard() {
    // Validate form inputs and handle card creation logic
    // You can use this method to send data to your backend API
    // and handle the card creation process
  }

  async showCardReaderPopup() {
    this.isLoading = true;
    try {
      if (this.selectedType === '1') {
        if (this.cardService.cardNumber === undefined || this.cardService.cardNumber === '') {
          this.popupService.cardReader = true;
        }
        if (this.cardService.cardNumber !== undefined) {
          let addCardResponse = await lastValueFrom(this.cardService.addCard(this.cardService.userID, this.cardService.lockID, this.cardService.cardNumber, this.cardName, "0", "0")) as addCardResponse;
          if (addCardResponse.cardId) {
            this.cardService.cardNumber = '';
            this.router.navigate(["users", this.cardService.userID, "lock", this.cardService.lockID]);
          } else if (addCardResponse.errcode === 10003) {
            sessionStorage.clear();
            this.router.navigate(['/login']);
          } else {
            console.log("ERROR:", addCardResponse)
          }
        }
      } else if (this.selectedType === '2') {
        let start = (moment(this.startDate).add(this.lockService.transformarHora(this.startHour), "milliseconds")).valueOf();
        let end = (moment(this.endDate).add(this.lockService.transformarHora(this.endHour), "milliseconds")).valueOf();
        if (this.cardService.cardNumber === undefined  || this.cardService.cardNumber === '') {
          this.popupService.cardReader = true;
        }
        if (this.cardService.cardNumber !== undefined) {
          let addCardResponse = await lastValueFrom(this.cardService.addCard(this.cardService.userID, this.cardService.lockID, this.cardService.cardNumber, this.cardName, start.toString(), end.toString())) as addCardResponse;
          if (addCardResponse.cardId) {
            this.cardService.cardNumber = '';
            this.router.navigate(["users", this.cardService.userID, "lock", this.cardService.lockID]);
          } else if (addCardResponse.errcode === 10003) {
            sessionStorage.clear();
            this.router.navigate(['/login']);
          } else {
            console.log("ERROR:", addCardResponse)
          }
        }
      }
    } catch (error) {
      console.error("Error while creating Card:", error);
    } finally {
      this.isLoading = false;
    }
  }
}
