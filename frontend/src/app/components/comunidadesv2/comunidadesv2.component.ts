import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { GatewayAccountResponse, GroupResponse, LockListResponse } from 'src/app/Interfaces/API_responses';
import { Group } from 'src/app/Interfaces/Group';
import { LockData } from 'src/app/Interfaces/Lock';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { GroupService } from 'src/app/services/group.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { DarkModeService } from '../../services/dark-mode.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { GatewayService } from 'src/app/services/gateway.service';
import { faHome } from '@fortawesome/free-solid-svg-icons'

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
    await this.getLocksWithoutGroup();
    let lockResponse = await lastValueFrom(this.lockService.getLockListAccount(this.userID)) as LockListResponse;
    //console.log(lockResponse)
    this.lockService.adminLocks = lockResponse.list;
    let gatewayResponse = await lastValueFrom(this.gatewayService.getGatewaysAccount(this.userID, 1, 100)) as GatewayAccountResponse;
    this.gatewayService.gateways = gatewayResponse.list;
    const lockGroupID = sessionStorage.getItem('lockGroupID');
    if (lockGroupID && lockGroupID !== 'undefined') {
      const grupoGuardado = this.groups.find(group => group.groupId === Number(lockGroupID));
      if (grupoGuardado) {
        this.chosenGroup = grupoGuardado;
        await this.chooseGroup(this.chosenGroup);
        this.isLoading = false;
        return;
      }
    }
    for (const group of this.groups) {
      const hasLocks = await this.groupHasLocks(group);
      if (hasLocks) {
        this.chosenGroup = group;
        await this.chooseGroup(this.chosenGroup);
        this.isLoading = false;
        return; // Exit once the first group with locks is found and selected
      }
    }
    await this.chooseNoGroup();
    this.isLoading = false;
    //console.log("This.groups: ", this.groups)
    //console.log("This.locksWithoutGroup", this.locksWithoutGroup)
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
      this.groupService.groups = this.groups;
      this.groupsFiltrados = this.groups;
    }
  }
  async fetchLocksOfGroup(clickedGroup: Group) {
    let targetGroupIndex = -1;
    let lockCount = 0;
    let pageNo = 1;
    const pageSize = 100;
    if (clickedGroup) {
      targetGroupIndex = this.groups.findIndex(group => group.groupId === clickedGroup.groupId);
    }
    if (targetGroupIndex !== -1) {
      if (this.groups[targetGroupIndex].locks.length === 0) {
        while (true) {
          let response = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, clickedGroup.groupId)) as LockListResponse;
          //console.log(response)
          if (response.list && response.list.length > 0) {
            lockCount += response.list.length;
            this.groups[targetGroupIndex].locks.push(...response.list);
            if (response.pages > pageNo) {
              pageNo++;
            } else {
              break;
            }
          } else {
            break;
          }
          console.log(this.groups)
        }
        this.groups[targetGroupIndex].lockCount = lockCount;
        this.groupService.groups = this.groups;
      } else {
        console.log('Locks already fetched for the clicked group.');
      }
    } else {
      console.error('Clicked group not found in the groups array.');
    }
  }
  async getLocksWithoutGroup() {
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
        break;
      }
    }
    this.groupService.locksWithoutGroup = this.locksWithoutGroup;
  }
  async chooseNoGroup() {
    let newGroup: Group = { groupId: -1, groupName: "Sin Asociar", lockCount: this.locksWithoutGroup.length, locks: this.locksWithoutGroup };
    this.chosenGroup = newGroup;
  }
  async chooseGroup(group: Group) {
    await this.fetchLocksOfGroup(group);
    this.chosenGroup = group;
  }
  searchGroups() {
    this.groupsFiltrados = this.groups.filter(group =>
      group.groupName.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }
  async toggleGroupVisibility(group: Group): Promise<void> {
    const groupId = group.groupId.toString();
    this.visibleGroups[groupId] = !this.visibleGroups[groupId];
    if (this.visibleGroups[groupId]) {
      await this.fetchLocksOfGroup(group)
    }
  }
  async groupHasLocks(group: Group): Promise<boolean> {
    await this.fetchLocksOfGroup(group);
    return group.locks && group.locks.length > 0;
  };
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
    sessionStorage.setItem('lockGroup', lock.groupName);
    sessionStorage.setItem('lockGroupID', lock.groupId?.toString());
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
    this.popupService.locksWithoutGroup = this.locksWithoutGroup;
    this.popupService.addLockGROUP = true;
  }
  remover(group: Group) {
    this.popupService.group = group;
    this.popupService.userID = this.userID;
    this.popupService.removeLockGROUP = true;
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
