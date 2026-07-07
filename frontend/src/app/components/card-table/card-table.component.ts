import { Component, Input, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { lastValueFrom } from 'rxjs';
import moment from 'moment';
import { Card } from 'src/app/Interfaces/Elements';
import { CardServiceService } from 'src/app/services/card-service.service';
import Swal from 'sweetalert2';
import { operationResponse } from 'src/app/Interfaces/API_responses';

@Component({
  selector: 'app-card-table',
  templateUrl: './card-table.component.html',
  styleUrls: ['./card-table.component.css']
})
export class CardTableComponent implements OnInit, AfterViewInit {

  @Input() lockId!: number;
  @Input() accessToken!: string;
  cards: any[] = [];
  displayedColumns = ['Nombre', 'Numero_tarjeta', 'Responsable', 'Fecha', 'Periodo_validez', 'Valido', 'Botones'];
  searchText = '';
  dataSource = new MatTableDataSource<any>();
  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;
  isLoading: boolean = false;

  constructor(
    public cardService: CardServiceService) { }

  async ngOnInit() {
    await this.loadCards();
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'Nombre':
          return item.cardName.toLowerCase();
        case 'Numero_tarjeta':
          return Number(item.cardNumber);
        case 'Responsable':
          return item.senderUsername.toLowerCase();
        case 'Fecha':
          return item.createDate;
        case 'Periodo_validez':
          return item.endDate;
        case 'Valido':
          return item.displayStatus.text;
        default:
          return item[property];
      }
    };
  }
  async loadCards() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(
        this.cardService.getCardsofLock(this.accessToken, this.lockId)
      );
      this.cards = (response?.list ?? []).map(card => ({
        ...card,
        displayStatus: this.consultarEstado(card)
      }));
      this.dataSource.data = this.cards;
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }
  async refresh() {
    await this.loadCards();
  }
  searchCards() {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }
  formatTimestamp(timestamp: number): string {
    return moment(timestamp).format('DD/MM/YYYY HH:mm');
  }
  periodoValidez(card: Card): string {
    if (Number(card.endDate) === 0) {
      return 'Permanente';
    }
    return `${moment(card.startDate).format('DD/MM/YYYY HH:mm')} - ${moment(card.endDate).format('DD/MM/YYYY HH:mm')}`;
  }
  private consultarEstado(card: Card): { text: string; color: string } {
    if (Number(card.endDate) === 0) {
      return { text: 'Válido', color: 'green' };
    }
    if (moment(card.endDate).isAfter(moment())) {
      return { text: 'Válido', color: 'green' };
    }
    return { text: 'Inválido', color: 'red' };
  }
  crearCard() {
    /*
    if (this.gateway === '1') {
      this.cardService.userID = this.userID;
      this.cardService.lockID = this.lockId;
      this.cardService.endDateUser = this.endDateDeUser;
      this.popupService.createCard = true;
      //this.router.navigate(["users", this.username, "lock", this.lockId, "card"]);
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }
      */
  }
  async borrarCard(cardID: number) {
    const result = await Swal.fire({
      title: 'Eliminar tarjeta',
      text: '¿Está seguro que desea eliminar esta tarjeta?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      confirmButtonColor: '#d33',
    });
    if (!result.isConfirmed) {
      return;
    }
    try {
      const response = await lastValueFrom(this.cardService.deleteCard(this.accessToken, this.lockId, cardID)) as operationResponse;
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'tarjeta eliminada', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible eliminar la tarjeta.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async cambiarNombreCard(cardID: number) {
    const { value: name } = await Swal.fire({
      title: 'Nuevo nombre',
      input: 'text',
      inputLabel: 'Nombre',
      inputPlaceholder: 'Ingrese el nuevo nombre',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Por favor ingrese un nombre';
        }
        return null;
      }
    });
    if (!name) {
      return;
    }
    try {
      const response = await lastValueFrom(this.cardService.changeName(this.accessToken, this.lockId, cardID, name)) as operationResponse;
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'Nombre actualizado', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else if (response.errcode === -3) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'El nombre ingresado es muy largo.', });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible cambiar el nombre.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    }
  }
  async cambiarPeriodoCard(cardID: number) {
    const { value } = await Swal.fire({
      title: 'Cambiar período de tarjeta',
      html: `
            <div style="display:flex; flex-direction:column; gap:12px; text-align:left">
              <label>Inicio</label>
              <input id="startDate" type="date" class="swal2-input">
              <label>Término</label>
              <input id="endDate" type="date" class="swal2-input">
            </div>
          `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const popup = Swal.getPopup()!;
        const startDate = (popup.querySelector('#startDate') as HTMLInputElement).value;
        const endDate = (popup.querySelector('#endDate') as HTMLInputElement).value;
        if (!startDate) {
          Swal.showValidationMessage('Debe ingresar fecha de inicio.');
          return;
        }
        if (!endDate) {
          Swal.showValidationMessage('Debe ingresar fecha de término.');
          return;
        }
        const start = new Date(`${startDate}T00:01`);
        const end = new Date(`${endDate}T23:59`);
        if (end <= start) {
          Swal.showValidationMessage('La fecha de término debe ser posterior a la de inicio.');
          return;
        }
        return { start, end };
      }
    });
    if (!value) return;
    this.isLoading = true;
    try {
      const startDate = value.permanent ? 0 : moment(value.start).valueOf();
      const endDate = value.permanent ? 0 : moment(value.end).valueOf();
      const response = await lastValueFrom(this.cardService.changePeriod(this.accessToken, this.lockId, cardID, startDate, endDate)) as operationResponse;
      console.log(response)
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'Período actualizado', timer: 1500, showConfirmButton: false, });
        await this.refresh();
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No fue posible cambiar el período.', });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado.', });
    } finally {
      this.isLoading = false;
    }
  }
}