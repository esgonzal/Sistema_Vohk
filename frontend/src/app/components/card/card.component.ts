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
  startDate: string;
  startHour: string = '';
  endDate: string;
  endHour: string = '';
  selectedType = '';
  onSelected(value: string): void { this.selectedType = value }

  validaFechaUsuario(diaFinal: string, horaFinal: string): boolean {
    if (this.cardService.endDateUser !== '0') {
      if (this.selectedType === "1" ) {
        this.error = "Usted como usuario con autorización temporal no puede crear una tarjeta permanente"
        return false
      }
      else {
        let unixTimestamp = parseInt(this.cardService.endDateUser);
        let endUser = moment.unix(unixTimestamp / 1000);
        let endDate = moment(diaFinal).add(this.lockService.transformarHora(horaFinal), "milliseconds")
        if (endUser.isBefore(endDate)) {
          this.error = "El permiso de autorización de su cuenta expira antes que el fin de uso de esta tarjeta, elija una fecha de fin de uso más temprana."
          return false;
        }
        else {
          return true
        }
      }
    }
    else {
      return true;
    }
  }
  validaFechaInicio(diaInicial: string, horaInicial: string, diaFinal: string, horaFinal: string): boolean {
    if (this.selectedType === "2") {
      let start = moment(diaInicial).add(this.lockService.transformarHora(horaInicial), "milliseconds")
      if (start.add(24, 'hours').isBefore(moment())) {
        this.error = "La tarjeta no puede iniciar 24 horas antes que ahora"
        return false;
      }
      else {
        let startDate = moment(diaInicial).add(this.lockService.transformarHora(horaInicial), "milliseconds")
        let endDate = moment(diaFinal).add(this.lockService.transformarHora(horaFinal), "milliseconds")
        if (endDate.isBefore(startDate)) {
          this.error = "El tiempo de inicio debe ser anterior al tiempo de finalización"
          return false;
        }
        else {
          return true;
        }
      }
    }
    else {
      return true;
    }
  }
  validarInputs(): boolean {//Verifica que el usuario rellenó los campos necesarios para crear una eKey
    this.error = '';
    if (this.cardName === '') {
      this.error = "Por favor llene el campo 'Nombre de la Tarjeta'";
    } else if (this.selectedType !== "1" && this.selectedType !== "2") {
      this.error = "Por favor elija un Tipo de Tarjeta";
    } else if (this.selectedType === '2' && (!this.startDate || !this.endDate || !this.startHour || !this.endHour)) {
      this.error = "Por favor rellene los datos de fecha y/o hora";
    }
    return this.error === '';
  }
  botonGenerarCard(){
    if (this.validarInputs()){
      if (this.validaFechaInicio(this.startDate, this.startHour, this.endDate, this.endHour)){
        if(this.validaFechaUsuario(this.endDate, this.endHour)) {
          this.crearCard();
        }
      }
    }
  }
  async crearCard() {
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
