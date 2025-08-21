import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { EkeyResponse, GatewayAccountResponse, GroupResponse, LockListResponse } from 'src/app/Interfaces/API_responses';
import { Group } from 'src/app/Interfaces/Group';
import { LockData } from 'src/app/Interfaces/Lock';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { GroupService } from 'src/app/services/group.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { DarkModeService } from '../../services/dark-mode.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { GatewayService } from 'src/app/services/gateway.service';
import { faHome } from '@fortawesome/free-solid-svg-icons'
import { Ekey } from 'src/app/Interfaces/Elements';
import * as XLSX from 'xlsx';
import { PasscodeServiceService } from 'src/app/services/passcode-service.service';

@Component({
  selector: 'app-comunidadesv2',
  templateUrl: './comunidadesv2.component.html',
  styleUrls: ['./comunidadesv2.component.css']
})
export class Comunidadesv2Component implements OnInit {

  faHome = faHome;
  isLoading: boolean = false;
  userID = sessionStorage.getItem('user') ?? '';

  groups: Group[] = [];
  groupsFiltrados: Group[] = [];
  locksWithoutGroup: LockData[] = [];
  visibleGroups: { [groupId: string]: boolean } = {};
  cols: number = 4;
  chosenGroup: Group
  darkMode: boolean;
  searchText: string = '';

  constructor(private groupService: GroupService,
    private ekeyService: EkeyServiceService,
    private passcodeService: PasscodeServiceService,
    private lockService: LockServiceService,
    private router: Router,
    public popupService: PopUpService,
    public DarkModeService: DarkModeService,
    private gatewayService: GatewayService,) {
    this.updateCols();
  }
  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    await this.fetchGroups();
    //let lockResponse = await lastValueFrom(this.lockService.getLockListAccount(this.userID)) as LockListResponse;
    //this.lockService.adminLocks = lockResponse.list;
    //let gatewayResponse = await lastValueFrom(this.gatewayService.getGatewaysAccount(this.userID, 1, 100)) as GatewayAccountResponse;
    //this.gatewayService.gateways = gatewayResponse.list;
    const lockGroupID = sessionStorage.getItem('lockGroupID');
    if (lockGroupID && lockGroupID !== 'undefined') {
      const grupoGuardado = this.groups.find(group => group.groupId === Number(lockGroupID));
      if (grupoGuardado) {
        this.chosenGroup = grupoGuardado;
        await this.chooseGroup(this.chosenGroup);
        if (grupoGuardado.groupId == -1) {
          this.popupService.locksWithoutGroup = grupoGuardado.locks
        }
        this.isLoading = false;
        return;
      }
    } else {
      let grupoInicial = this.groups.find(group => group.groupId === -1);
      if (grupoInicial) {
        await this.chooseGroup(grupoInicial);
        this.popupService.locksWithoutGroup = grupoInicial.locks;
        this.isLoading = false;
        return;
      }
    }
    this.isLoading = false;
  }
  async fetchGroups() {
    try {
      let response = await lastValueFrom(this.groupService.getGroupofAccount(this.userID)) as GroupResponse;
      if (response.list) {
        this.groups = response.list.map(group => ({
          ...group,
          locks: [] as LockData[],  // Initialize locks array for each group
          lockCount: 0
        }));
      } else if (response.errcode === 10003) {
        sessionStorage.clear;
      } else {
        console.log(response);
      }
    } catch (error) {
      console.error("Error while fetching groups:", error);
    } finally {
      let newGroup: Group = { groupId: -1, groupName: "Sin Asociar", lockCount: 0, locks: [] };
      this.groups.push(newGroup);
      //console.log("fetchGroups: ", this.groups)
      this.groupService.groups = this.groups;
      this.groupsFiltrados = this.groups;
    }
  }
  async fetchLocksOfGroup(clickedGroup: Group) {
    this.isLoading = true;
    let targetGroupIndex = -1;
    let lockCount = 0;
    let pageNo = 1;
    const pageSize = 100;
    if (clickedGroup) {
      targetGroupIndex = this.groups.findIndex(group => group.groupId === clickedGroup.groupId);
    }
    if (this.groups[targetGroupIndex].locks.length === 0) {
      while (true) {
        let response = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, clickedGroup.groupId)) as LockListResponse;
        //console.log(clickedGroup.groupName, ": ", response.list)
        if (response.list && response.list.length > 0) {
          lockCount += response.list.length;
          this.groups[targetGroupIndex].locks.push(...response.list);
          if (response.pages > pageNo) {
            pageNo++;
          } else {
            this.isLoading = false;
            break;
          }
        } else {
          this.isLoading = false;
          break;
        }
      }
      this.groups[targetGroupIndex].lockCount = lockCount;
      this.groupService.groups = this.groups;
    } else {
      this.isLoading = false;
    }
  }
  async chooseGroup(group: Group) {
    await this.fetchLocksOfGroup(group);
    this.chosenGroup = group;
  }
  /*
  async getLocksWithoutGroup() {
    this.locksWithoutGroup = [];
    let pageNo = 1;
    const pageSize = 100;
    while (true) {
      let response = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, 0)) as LockListResponse;
      if (response.list) {
        this.locksWithoutGroup.push(...response.list.filter(lock => !lock.groupId))
        if (response.pages > pageNo) {
          pageNo++;
        } else {
          break;
        }
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      } else {
        console.log(response)
        break;
      }
    }
    console.log("getLocksWithoutGroup: ", this.locksWithoutGroup)
    this.groupService.locksWithoutGroup = this.locksWithoutGroup;
  }
  async chooseNoGroup() {
    this.isLoading = true;
    await this.getLocksWithoutGroup();
    let newGroup: Group = { groupId: -1, groupName: "Sin Asociar", lockCount: 0, locks: [] };
    this.chosenGroup = newGroup;
    this.isLoading = false;
  }
  */
  searchGroups() {
    this.groupsFiltrados = this.groups.filter(group =>
      group.groupName.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }
  hasValidAccess(lock: LockData): boolean {
    if ((Number(lock.endDate) === 0 || moment(lock.endDate).isAfter(moment())) && (lock.userType === '110301' || (lock.userType === '110302' && lock.keyRight === 1))) {
      return true
    } else {
      return false;
    }
  }
  onLockButtonClick(lock: LockData) {
    sessionStorage.setItem('lockID', lock.lockId.toString())
    sessionStorage.setItem('keyID', lock.keyId.toString())
    sessionStorage.setItem('userType', lock.userType)
    sessionStorage.setItem('keyRight', lock.keyRight.toString())
    sessionStorage.setItem('startDate', lock.startDate)
    sessionStorage.setItem('endDate', lock.endDate)
    sessionStorage.setItem('lockAlias', lock.lockAlias)
    sessionStorage.setItem('lockBatery', lock.electricQuantity.toString())
    sessionStorage.setItem('lockGateway', lock.hasGateway.toString())
    sessionStorage.setItem('lockFeature', lock.featureValue.toString())
    if (lock.groupId) {
      sessionStorage.setItem('lockGroup', lock.groupName);
      sessionStorage.setItem('lockGroupID', lock.groupId?.toString());
    } else {
      sessionStorage.setItem('lockGroup', "Sin Asociar");
      sessionStorage.setItem('lockGroupID', "-1");
    }

    this.router.navigate(['users', this.userID, 'lock', lock.lockId])
  }
  onInvalidButtonClick() {
    this.popupService.invalidLock = true;
  }
  crearGrupo() {
    this.popupService.userID = this.userID
    this.popupService.newGroup = true;
  }
  cambiarNombre(grupoID: number) {
    this.popupService.userID = this.userID;
    this.popupService.elementType = 'grupo';
    this.popupService.elementID = grupoID;
    this.popupService.cambiarNombre = true
  }
  eliminar(grupoID: number) {
    this.popupService.userID = this.userID;
    this.popupService.elementType = 'grupo';
    this.popupService.elementID = grupoID;
    this.popupService.delete = true
  }
  agregar(group: Group) {
    this.popupService.group = group;
    this.popupService.userID = this.userID;
    //this.popupService.locksWithoutGroup = this.locksWithoutGroup;
    this.popupService.addLockGROUP = true;
  }
  remover(group: Group) {
    this.popupService.group = group;
    this.popupService.userID = this.userID;
    this.popupService.removeLockGROUP = true;
  }
  async descargarExcel(group: Group) {
    this.isLoading = true;
    let ekeysMap: { [username: string]: { eKey: string, cerraduras: { [lockName: string]: string } } } = {};
    let lockNames: string[] = group.locks.map(lock => lock.lockAlias); // Columnas con nombres de cerraduras
    for (let i = 0; i < group.lockCount; i++) {
      let lockActual = group.locks[i];
      const response = await lastValueFrom(this.ekeyService.getEkeysofLock(this.userID, lockActual.lockId, 1, 200)) as EkeyResponse;
      let ekeys: Ekey[] = response.list;
      for (let ekey of ekeys) {
        if (!ekey.username) continue; // Evitar problemas con cuentas vacías
        if (!ekeysMap[ekey.username]) {
          ekeysMap[ekey.username] = {
            eKey: ekey.keyName, // Guardamos un nombre de eKey representativo
            cerraduras: {}
          };
        }
        ekeysMap[ekey.username].cerraduras[lockActual.lockAlias] = "X";
      }
    }
    // Convertir datos a un formato adecuado para `json_to_sheet`
    let data: any[] = Object.keys(ekeysMap).map(username => {
      let row: any = {
        Cuenta: username,
        eKey: ekeysMap[username].eKey, // Se mostrará solo una de las eKeys
      };
      lockNames.forEach(lock => {
        row[lock] = ekeysMap[username].cerraduras[lock] || "";
      });
      return row;
    });
    // Crear hoja de Excel
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'eKeys');
    // 🔹 Ajustar el ancho de las columnas según su contenido
    ws['!cols'] = [
      { wch: 25 }, // Ancho para la columna "Cuenta"
      { wch: 25 }, // Ancho para la columna "eKey"
      ...lockNames.map(() => ({ wch: 25 })) // Ancho para las cerraduras
    ];
    this.isLoading = false;
    // Guardar el archivo con el nombre del grupo
    XLSX.writeFile(wb, `Ekeys_${group.groupName}.xlsx`);
  }
  invitaciones(group: Group) {
    const eligibleLocks = group.locks.filter(lock => {
      const hasGateway = lock.hasGateway === 1;
      const allowsCodes = this.lockService.checkFeature(lock.featureValue, 0);
      return hasGateway && allowsCodes;
    });
    // store all locks in passcodeService
    this.passcodeService.availableLocks = eligibleLocks.map(lock => ({
      id: lock.lockId,
      alias: lock.lockAlias
    }));

    // start with all selected
    this.passcodeService.selectedLocks = [...this.passcodeService.availableLocks];
    this.popupService.invitation = true
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.updateCols(); // Update cols value on resize
  }
  private updateCols() {
    const screenWidth = window.innerWidth;
    const imageWidthWithMargin = 220; // 200px width + 10px margin
    if (screenWidth <= 600) { // Mobile breakpoint
      const numColumns = Math.floor(screenWidth / (imageWidthWithMargin / 2)); // Adjusting for smaller cards on mobile
      this.cols = 2;
    } else {
      const numColumns = Math.min(Math.floor(screenWidth / imageWidthWithMargin), 4); // Maximum of 4 columns on larger screens
      this.cols = numColumns;
    }
  }
}
