import { Component, Input, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { lastValueFrom } from 'rxjs';
import moment from 'moment';
import { RecordServiceService } from 'src/app/services/record-service.service';
import { Record } from 'src/app/Interfaces/Elements';

@Component({
  selector: 'app-record-table',
  templateUrl: './record-table.component.html',
  styleUrls: ['./record-table.component.css']
})
export class RecordTableComponent implements OnInit, AfterViewInit {

  @Input() lockId!: number;
  @Input() accessToken!: string;
  displayedColumns = ['Fecha', 'Usuario', 'Tipo', 'Descripcion'];
  records: Record[] = [];
  dataSource = new MatTableDataSource<Record>();
  searchText = '';
  totalRecords = 0;
  currentPage = 0;
  readonly pageSize = 200;
  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;
  isLoading: boolean = false;

  constructor(
    private recordService: RecordServiceService) { }

  async ngOnInit() {
    await this.loadPage(1);
  }
  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'Fecha':
          return item.lockDate;
        case 'Usuario':
          return (item.keyName || item.username || item.keyboardPwd || '').toLowerCase();
        case 'Tipo':
          return item.metodo;
        case 'Descripcion':
          return item.displaySuccess.text;
        default:
          return item[property];
      }
    };
  }
  async loadPage(page: number) {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.recordService.getRecords(this.accessToken, this.lockId, page, this.pageSize));
      console.log(response)
      this.records = (response.list ?? []).map(record => ({
        ...record,
        displaySuccess: this.consultarSuccess(record.success),
        metodo: this.consultarMetodo(record.recordType, record.keyName || record.username || record.keyboardPwd || '')
      }));
      this.totalRecords = response.total;
      this.currentPage = page - 1;
      this.dataSource.data = this.records;
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }
  async pageChanged(event: PageEvent) {
    if (event.pageIndex !== this.currentPage) {
      await this.loadPage(event.pageIndex + 1);
    }
  }
  async refresh() {
    await this.loadPage(this.currentPage + 1);
  }
  searchRecords() {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }
  formatTimestamp(timestamp: number): string {
    return moment(timestamp).format('DD/MM/YYYY HH:mm');
  }
  private consultarSuccess(success: number): { text: string; color: string } {
    return success === 1
      ? { text: 'Éxito', color: 'green' }
      : { text: 'Fallido', color: 'red' };
  }
  consultarMetodo(tipo: number, operador: string): string {
    const metodoMap: { [key: number]: string | ((operador: string) => string) } = {
      1: 'Abrir con la aplicación',
      4: 'Abrir con código de acceso',
      5: 'modify a passcode on the lock',
      6: 'delete a passcode on the lock',
      7: (operador: string) => `Abrir con código de acceso—${operador}`,
      8: 'clear passcodes from the lock',
      9: 'passcode be squeezed out',
      10: 'unlock with passcode with delete function, passcode before it will all be deleted',
      11: (operador: string) => `Abrir con código de acceso—${operador}`,
      12: (operador: string) => `Abrir con código de acceso—${operador}`,
      13: (operador: string) => `Abrir con código de acceso—${operador}`,
      14: 'lock power on',
      15: 'add card success',
      16: 'clear cards',
      17: 'Abrir con Tarjeta RF',
      18: 'delete an card',
      19: 'unlock by wrist strap success',
      20: 'Abrir con huella digital',
      21: 'add fingerprint',
      22: 'Abrir con huella digital',
      23: 'delete a fingerprint',
      24: 'clear fingerprints',
      25: 'Abrir con Tarjeta RF',
      26: 'Cerrar con Aplicación',
      27: 'unlock by Mechanical key',
      28: 'Abrir de forma remota',
      29: 'apply some force on the Lock',
      30: 'Door sensor closed',
      31: 'Door sensor open',
      32: 'open from inside',
      33: 'lock by fingerprint',
      34: 'lock by passcode',
      35: 'lock by card',
      36: 'lock by Mechanical key',
      37: 'Remote Control',
      38: 'unlock by passcode failed—The door has been double locked',
      39: 'unlock by IC card failed—The door has been double locked',
      40: 'Abrir con huella digital',
      41: 'unlock by app failed—The door has been double locked',
      42: 'received new local mail',
      43: "received new other cities' mail",
      44: 'Tamper alert',
      45: 'Se cierra automáticamente al final del Modo de Paso',
      46: 'unlock by unlock key',
      47: 'lock by lock key',
      48: '¡Detectados intentos de acceso no autorizados!',
      49: 'unlock by hotel card',
      50: 'Unlocked due to the high temperature',
      51: 'unlock by card failed—card in blacklist',
      52: 'Dead lock with APP',
      53: 'Dead lock with passcode',
      54: 'The car left (for parking lock)',
      55: 'unlock with key fob',
      57: 'Unlock with QR code success',
      58: "Unlock with QR code failed, it's expired",
      59: 'Double locked',
      60: 'Cancel double lock',
      61: 'Lock with QR code success',
      62: 'Lock with QR code failed, the lock is double locked',
      63: 'Auto unlock at passage mode',
      64: 'Door unclosed alarm',
      65: 'Failed to unlock',
      66: 'Failed to lock',
      67: 'Face unlock success',
      68: 'Face unlock failed - door locked from inside',
      69: 'Lock with face',
      70: 'Face registration success',
      71: 'Face unlock failed - expired or ineffective',
      72: 'Delete face success',
      73: 'Clear face success',
      74: 'IC card unlock failed - CPU secure information error',
      75: 'App authorized button unlock success',
      76: 'Gateway authorized button unlock success',
      77: 'Dual authentication Bluetooth unlock verification success, waiting for second user',
      78: 'Dual authentication password unlock verification success, waiting for second user',
      79: 'Dual authentication fingerprint unlock verification success, waiting for second user',
      80: 'Dual authentication IC card unlock verification success, waiting for second user',
      81: 'Dual authentication face card unlock verification success, waiting for second user',
      82: 'Dual authentication wireless key unlock verification success, waiting for second user',
      83: 'Dual authentication palm vein unlock verification success, waiting for second user',
      84: 'Palm vein unlock success',
      85: 'Palm vein unlock success',
      86: 'Lock with palm vein',
      87: 'Register palm vein success',
      88: 'Palm vein unlock failed - expired or ineffective'
    };
    const metodo = metodoMap[tipo];
    if (!metodo) { return 'Unknown type'; }
    return typeof metodo === 'function' ? metodo(operador) : metodo;
  }
}