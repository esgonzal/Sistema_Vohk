import { Component, Input, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { lastValueFrom } from 'rxjs';
import moment from 'moment';
import { Passcode } from 'src/app/Interfaces/Elements';
import { PasscodeServiceService } from 'src/app/services/passcode-service.service';
import { LockServiceService } from 'src/app/services/lock-service.service';

@Component({
  selector: 'app-passcode-table',
  templateUrl: './passcode-table.component.html',
  styleUrls: ['./passcode-table.component.css']
})
export class PasscodeTableComponent implements OnInit, AfterViewInit {

  @Input() lockId!: number;
  @Input() accessToken!: string;
  passcodes: Passcode[] = [];
  displayedColumns = ['Nombre', 'Contrasena', 'Responsable', 'Fecha', 'Periodo_validez', 'Valido', 'Botones'];
  searchText = '';
  dataSource = new MatTableDataSource<Passcode>();
  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;
  isLoading: boolean = false;

  constructor(public passcodeService: PasscodeServiceService, public lockService: LockServiceService) { }

  async ngOnInit() {
    await this.loadPasscodes();
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'Nombre':
          return Number(item.keyboardPwdName);
        case 'Contrasena':
          return Number(item.keyboardPwd);
        case 'Responsable':
          return item.senderUsername;
        case 'Fecha':
          return item.sendDate;
        case 'Periodo_validez':
          return item.endDate;
        case 'Valido':
          return item.displayStatus.text;
        default:
          return item[property];
      }
    };
  }
  async loadPasscodes() {
    this.isLoading = true;
    try {

      const response = await lastValueFrom(this.passcodeService.getPasscodesofLock(this.accessToken, this.lockId));
      console.log(response)
      this.passcodes = (response?.list ?? []).map(passcode => ({
        ...passcode,
        displayStatus: this.consultarEstado(passcode),
        displayDate: this.formatTimestamp(passcode.sendDate),
        displayPeriod: this.periodoValidez(passcode)
      }));
      this.dataSource.data = this.passcodes;
      console.log(this.passcodes);
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }
  async refresh() {
    await this.loadPasscodes();
  }
  searchPasscodes() {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }
  private consultarEstado(passcode: Passcode): { text: string; color: string } {
    if (passcode.keyboardPwdType === 1) {
      const expiracion = moment(passcode.startDate).add(6, 'hours');
      return moment().isAfter(expiracion) ? { text: 'Caducado', color: 'red' } : { text: 'Valido', color: 'green' };
    }
    if (passcode.keyboardPwdType === 3) {
      const ahora = moment();
      const inicio = moment(passcode.startDate);
      const fin = moment(passcode.endDate);
      if (ahora.isBefore(inicio) || ahora.isAfter(fin) || fin.isBefore(inicio)) {
        return { text: 'Inactivo', color: 'red' };
      }
      return { text: 'Valido', color: 'green' };
    }
    return { text: 'Valido', color: 'green' };
  }
  formatTimestamp(timestamp: string): string {
    return moment(timestamp).format('DD/MM/YYYY HH:mm');
  }
  periodoValidez(passcode: Passcode): string {
    switch (passcode.keyboardPwdType) {
      case 1:
        return `${moment(passcode.sendDate).format('DD/MM/YYYY HH:mm')} Una Vez`;
      case 2:
        return 'Permanente';
      case 3:
        return `${moment(passcode.startDate).format('DD/MM/YYYY HH:mm')} - ${moment(passcode.endDate).format('DD/MM/YYYY HH:mm')}`;
      case 4:
        return `${moment(passcode.sendDate).format('DD/MM/YYYY HH:mm')} Borrar`;
      case 5:
        return this.formatHorario(passcode, 'Fin de Semana');
      case 6:
        return this.formatHorario(passcode, 'Diaria');
      case 7:
        return this.formatHorario(passcode, 'Dia de Trabajo');
      case 8:
        return this.formatHorario(passcode, 'Lunes');
      case 9:
        return this.formatHorario(passcode, 'Martes');
      case 10:
        return this.formatHorario(passcode, 'Miercoles');
      case 11:
        return this.formatHorario(passcode, 'Jueves');
      case 12:
        return this.formatHorario(passcode, 'Viernes');
      case 13:
        return this.formatHorario(passcode, 'Sabado');
      default:
        return this.formatHorario(passcode, 'Domingo');
    }
  }
  private formatHorario(passcode: Passcode, nombre: string): string {
    const inicio = moment(passcode.startDate).format('HH:mm');
    const fin = moment(passcode.endDate).format('HH:mm');
    return `${inicio} - ${fin} ${nombre}`;
  }

  crearPasscode() {
    /*
    this.passcodeService.lockAlias = this.Alias;
    this.passcodeService.userID = this.userID;
    this.passcodeService.username = this.userID;
    this.passcodeService.lockID = this.lockId;
    this.passcodeService.endDateUser = this.endDateDeUser;
    this.passcodeService.gateway = Number(this.gateway)
    this.passcodeService.featureValue = this.featureValue;
    this.popupService.createPasscode = true;
    //this.router.navigate(["users", this.username, "lock", this.lockId, "passcode"]);
    */
  }
  borrarPasscode(passcodeID: number) {/*
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'el código';
      this.popupService.elementID = passcodeID;
      this.popupService.delete = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }*/
  }
  cambiarNombrePasscode(passcode: Passcode) {/*
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'passcode';
      this.popupService.elementID = passcode.keyboardPwdId;
      this.popupService.passcode = passcode;
      this.popupService.cambiarNombre = true;
    } else {
      this.popupService.needGateway = true;
    }*/
  }
  cambiarPeriodoPasscode(passcode: Passcode) {/*
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'passcode';
      this.popupService.elementID = passcode.keyboardPwdId;
      this.popupService.passcode = passcode;
      this.popupService.cambiarPeriodo = true;
    } else {
      this.popupService.needGateway = true;
    }*/
  }
  cambiarPasscode(passcode: Passcode) {/*
    if (this.gateway === '1') {
      this.popupService.userID = this.userID;
      this.popupService.lockID = this.lockId;
      this.popupService.elementType = 'passcode';
      this.popupService.elementID = passcode.keyboardPwdId;
      this.popupService.passcode = passcode;
      this.popupService.editarPasscode = true;
    } else {
      this.popupService.needGateway = true;
      console.log("Necesita estar conectado a un gateway para usar esta función")
    }*/
  }
  compartirPasscode(passcode: Passcode) {
    /*
    this.popupService.userID = this.userID;
    this.popupService.lock_alias = this.Alias;
    this.popupService.passcode = passcode;
    this.popupService.sharePasscode = true;*/
  }

}