import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { GroupResponse, LockListResponse } from 'src/app/Interfaces/API_responses';
import { Group } from 'src/app/Interfaces/Group';
import { LockData } from 'src/app/Interfaces/Lock';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { GroupService } from 'src/app/services/group.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { faBatteryFull, faBatteryThreeQuarters, faBatteryHalf, faBatteryQuarter, faBatteryEmpty, faGear, faWifi, faAngleUp, faAngleDown } from '@fortawesome/free-solid-svg-icons'

@Component({
  selector: 'app-comunidades',
  templateUrl: './comunidades.component.html',
  styleUrls: ['./comunidades.component.css']
})
export class ComunidadesComponent implements OnInit {

  isLoading: boolean = false;
  userID = sessionStorage.getItem('user') ?? '';
  groups: Group[] = [];
  locksWithoutGroup: LockData[] = [];
  faBatteryFull = faBatteryFull
  faBatteryThreeQuarters = faBatteryThreeQuarters
  faBatteryHalf = faBatteryHalf
  faBatteryQuarter = faBatteryQuarter
  faBatteryEmpty = faBatteryEmpty
  faGear = faGear
  faWifi = faWifi
  faAngleUp = faAngleUp
  faAngleDown = faAngleDown
  visibleGroups: { [groupId: string]: boolean } = {};
  cols: number = 6;

  constructor(private groupService: GroupService,
    private ekeyService: EkeyServiceService,
    private router: Router,
    public popupService: PopUpService) {
    this.updateCols();
  }

  async ngOnInit(): Promise<void> {
    await this.fetchGroups();
    await this.getLocksWithoutGroup();
    const lockGroupID = sessionStorage.getItem('lockGroupID');
    if (lockGroupID) {
      this.visibleGroups[lockGroupID] = true;
      let openGroup: Group = {groupId: Number(lockGroupID), groupName: '', lockCount: 0, locks: []}
      await this.fetchLocksOfGroup(openGroup)
    }
    console.log("This.groups: ",this.groups)
    console.log("This.locksWithoutGroup",this.locksWithoutGroup)
  }
  async fetchGroups() {
    this.isLoading = true;
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
      this.isLoading = false;
      this.groupService.groups = this.groups;
    }
  }
  async fetchLocksOfGroup(clickedGroup: Group) {
    let lockCount = 0;
    let pageNo = 1;
    const pageSize = 100;
    const targetGroupIndex = this.groups.findIndex(group => group.groupId === clickedGroup.groupId);
    if (targetGroupIndex !== -1) {
      if (this.groups[targetGroupIndex].locks.length === 0) {
        while (true) {
          this.isLoading = true;
          let response = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, clickedGroup.groupId)) as LockListResponse;
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
        this.isLoading = false;
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
  async toggleGroupVisibility(group: Group): Promise<void> {
    
    const groupId = group.groupId.toString();
    this.visibleGroups[groupId] = !this.visibleGroups[groupId];
    if (this.visibleGroups[groupId]) {
      console.log("se abre")
      await this.fetchLocksOfGroup(group)
    } else {console.log("se cierra")}
  }
  isGroupVisible(group: Group): boolean {
    const groupId = group.groupId.toString();
    return this.visibleGroups[groupId];
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

    if (screenWidth <= 600) { // Mobile breakpoint
      this.cols = 2;
    } else {
      // Calculate number of columns based on screen width
      const numColumns = Math.min(Math.floor(screenWidth / 200), 6);
      this.cols = numColumns;
    }
  }
}
