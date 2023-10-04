import { Component, OnInit } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { UserServiceService } from '../../services/user-service.service';
import { GroupService } from '../../services/group.service';
import { PopUpService } from '../../services/pop-up.service';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { GroupResponse, LockListResponse } from '../../Interfaces/API_responses'
import { LockData } from '../../Interfaces/Lock';
import { Group } from '../../Interfaces/Group';

@Component({
  selector: 'app-grupo-cerraduras',
  templateUrl: './grupo-cerraduras.component.html',
  styleUrls: ['./grupo-cerraduras.component.css']
})
export class GrupoCerradurasComponent implements OnInit {

  username = sessionStorage.getItem('user') ?? ''
  displayedColumnsGroup: string[] = ['Nombre', 'Cantidad', 'Operacion'];
  groups: Group[] = [];
  allLocks: LockData[] = [];
  locksWithoutGroup: LockData[] = [];
  isLoading: boolean = false;
  userID: string;

  constructor(
    private ekeyService: EkeyServiceService,
    private userService: UserServiceService,
    public groupService: GroupService,
    public popupService: PopUpService
  ) { }

  async ngOnInit() {
    if (sessionStorage.getItem('Account') === 'Vohk') {
      this.userID = this.userService.encodeNombre(this.username);
    } else {
      this.userID = this.username
    }
    await this.getAllLocks();
    await this.fetchGroups();
  }
  async fetchGroups() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.groupService.getGroupofAccount(this.userID));
      const typedResponse = response as GroupResponse;
      if (typedResponse?.list) {
        this.groups = typedResponse.list;
        for (const group of this.groups) {
          group.lockCount = await this.calculateLockCountForGroup(group);
        }
      } else {
        console.log("Groups not yet available");
      }
    } catch (error) {
      console.error("Error while fetching groups:", error);
    } finally {
      this.isLoading = false;
    }
    this.groupService.groups = this.groups;
  }
  async calculateLockCountForGroup(group: Group): Promise<number> {
    let lockCount = 0;
    let pageNo = 1;
    const pageSize = 100;
    group.locks = [];
    while (true) {
      const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, group.groupId));
      const locksTypedResponse = locksResponse as LockListResponse;
      if (locksTypedResponse?.list && locksTypedResponse.list.length > 0) {
        lockCount += locksTypedResponse.list.length;
        group.locks.push(...locksTypedResponse.list);
        if (locksTypedResponse.pages > pageNo) {
          pageNo++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return lockCount;
  }
  async getAllLocks() {
    this.isLoading = true;
    try {
      let pageNo = 1;
      const pageSize = 100;
      while (true) {
        const locksTypedResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, 0)) as LockListResponse;
        if (locksTypedResponse?.list) {
          this.allLocks.push(...locksTypedResponse.list)
          this.locksWithoutGroup.push(...locksTypedResponse.list.filter(lock => !lock.groupId))
          if (locksTypedResponse.pages > pageNo) {
            pageNo++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      this.ekeyService.currentLocks = this.allLocks.filter(
        lock => lock.userType === '110301' || (lock.userType === '110301' && lock.keyRight === 1)
      );
      this.groupService.locksWithoutGroup = this.locksWithoutGroup;
    } catch (error) {
      console.error("Error while fetching all locks:", error);
    } finally {
      this.isLoading = false;
    }
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
  cerraduras(group: Group) {
    this.popupService.group = group;
    this.popupService.userID = this.userID;
    this.popupService.locksWithoutGroup = this.groupService.locksWithoutGroup;
    this.popupService.addRemoveLockGROUP = true;
  }
}
