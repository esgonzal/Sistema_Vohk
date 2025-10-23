import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PasscodeServiceService } from 'src/app/services/passcode-service.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { DarkModeService } from 'src/app/services/dark-mode.service';
import { CardServiceService } from 'src/app/services/card-service.service';
import * as XLSX from 'xlsx';
import { lastValueFrom } from 'rxjs';
import { CardResult, MultipleCardResponse } from 'src/app/Interfaces/API_responses';

@Component({
  selector: 'app-multiple-cards',
  templateUrl: './multiple-cards.component.html',
  styleUrls: ['./multiple-cards.component.css']
})
export class MultipleCardsComponent implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef;

  isLoading: boolean = false;
  error = "";
  cards: { name: string, tipo: number, number: string }[];

  constructor(
    private router: Router,
    private passcodeService: PasscodeServiceService,
    public popupService: PopUpService,
    public DarkModeService: DarkModeService,
    private cardService: CardServiceService) {
    if (!this.cardService.userID || !this.cardService.lockID || !this.cardService.endDateUser) {
      this.router.navigate(['users', sessionStorage.getItem('user'), 'lock', sessionStorage.getItem('lockID')])
    }
  }

  ngOnInit(): void {
    console.log(this.cards)
    this.cards = [{
      name: '', tipo: 1, number: '',
    }];
  }

  removeCard(index: number) {
    this.cards.splice(index, 1);
  }
  addCard() {
    const newCard = {
      name: '',
      tipo: 1,
      number: '',
    };
    this.cards.push(newCard);
    console.log(this.cards)
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length) {
      const file = target.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Obtener los datos como una matriz

        // Procesar los datos desde la fila 3
        this.processExcelData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  private processExcelData(data: any[]) {
    // Start from row 2 (index 1), assuming row 1 is headers
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      console.log("Row:", row);
      // Make sure row has at least 2 values (name + code)
      if (row.length >= 2) {
        const name = row[0];  // Column B
        const number = row[1];  // Column C
        // Create passcode object
        const card = {
          name: name || '',
          tipo: 1, // default "Permanente"
          number: number || ''
        };
        // Add to array
        this.cards.push(card);
      }
    }
    console.log(this.cards)
  }

  async validarInputs() {
      this.error = "";
      for (let card of this.cards) {
        if (!card.name) {
          this.error = "Por favor rellene el campo 'Nombre'";
        }
        else if (!card.number) {
          this.error = "Por favor rellene el campo 'Numero'";
        }
      }
      if (this.error === '') {
        this.isLoading = true;
        let response = await lastValueFrom(this.cardService.multipleCards(this.cardService.userID, this.cardService.lockID, this.cards)) as CardResult[]
        this.popupService.multipleCardResults = response;
        //console.log(this.popupService.multiplePasscodeResults)
        this.isLoading = false;
        this.popupService.multipleCardsResult = true;
      }
    }

}
