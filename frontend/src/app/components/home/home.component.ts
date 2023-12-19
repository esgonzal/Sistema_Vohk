import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  cardNumber: string = '';

  constructor() { }

  ngOnInit(): void {
    // Event listener for card reading
    document.addEventListener('keydown', (event) => {
      this.cardNumber += event.key;
      if (event.key === 'Enter') {
        const trimmedCardNumber = this.cardNumber.replace(/\D/g, '');
        if (trimmedCardNumber !== '') {
          console.log('Card Number:', trimmedCardNumber);
          this.cardNumber = '';
        }
      }
    });
  }
}

