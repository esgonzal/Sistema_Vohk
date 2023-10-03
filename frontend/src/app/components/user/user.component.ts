import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LockData,  } from '../../Interfaces/Lock';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { faBatteryFull, faBatteryThreeQuarters, faBatteryHalf, faBatteryQuarter, faBatteryEmpty, faGear, faWifi } from '@fortawesome/free-solid-svg-icons'
import { PopUpService } from '../../services/pop-up.service';
import { GroupService } from '../../services/group.service';
import { Subscription } from 'rxjs';
import { Group,  } from '../../Interfaces/Group';
import { LockListResponse, GroupResponse } from '../../Interfaces/API_responses'
import moment from 'moment';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css'],
  providers: []
})
export class UserComponent implements OnInit {

  username = sessionStorage.getItem('user') ?? '';
  token = sessionStorage.getItem('token') ?? '';
  isLoading: boolean = false;
  ekeyList: LockListResponse;
  allLocks: LockData[] = [];
  locks: LockData[] = [];
  locksWithoutGroup: LockData[] = [];
  groups: Group[] = [];
  faBatteryFull = faBatteryFull
  faBatteryThreeQuarters = faBatteryThreeQuarters
  faBatteryHalf = faBatteryHalf
  faBatteryQuarter = faBatteryQuarter
  faBatteryEmpty = faBatteryEmpty
  faGear = faGear
  faWifi = faWifi
  private selectedGroupSubscription: Subscription;

  constructor(private router: Router, public groupService: GroupService, private ekeyService: EkeyServiceService, public popupService: PopUpService) { }

  async ngOnInit() {
    await this.getAllLocks();
    await this.fetchGroups();
    //await this.getLocksWithoutGroup();
    this.groupService.selectedGroupSubject.subscribe(async selectedGroup => {
      if (selectedGroup) {
        await this.fetchLocks(selectedGroup.groupId);
        //console.log("All Locks",this.allLocks)
        //console.log("Locks without group",this.locksWithoutGroup)
      }
    });
  }
  ngOnDestroy() {
    if (this.selectedGroupSubscription) {
      this.selectedGroupSubscription.unsubscribe();
    }
  }
  async fetchLocks(groupId: number) {
    this.isLoading = true;
    try {
      await this.fetchLocksPage(1, groupId);
    } catch (error) {
      console.error("Error while fetching Locks: ", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
    //console.log("Locks actuales", this.locks)
  }
  async fetchLocksPage(pageNo: number, groupId?: number) {
    this.locks = [];
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.token, pageNo, 100, groupId));
      const typedResponse = response as LockListResponse;
      if (typedResponse?.list) {
        this.locks.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchLocksPage(pageNo + 1, groupId);
        }
      } else {
        console.log("Locks not yet available")
      }
    } catch (error) {
      console.error("Error while fetching locks page:", error)
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
  }
  async fetchGroups() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.groupService.getGroupofAccount(this.token));
      const typedResponse = response as GroupResponse;
      if (typedResponse?.list) {
        this.groups = typedResponse.list;
        // Fetch locks and calculate lock counts for each group
        for (const group of this.groups) {
          group.lockCount = await this.calculateLockCountForGroup(group);
        }
      } else {
        console.log("Groups not yet available");
      }
    } catch (error) {
      console.error("Error while fetching groups:", error);
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
    this.groupService.groups = this.groups;
  }
  async calculateLockCountForGroup(group: Group): Promise<number> {
    let lockCount = 0;
    let pageNo = 1;
    const pageSize = 100;
    group.locks = [];
    while (true) {
      const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.token, pageNo, pageSize, group.groupId));
      const locksTypedResponse = locksResponse as LockListResponse;
      if (locksTypedResponse?.list && locksTypedResponse.list.length > 0) {
        lockCount += locksTypedResponse.list.length;
        group.locks.push(...locksTypedResponse.list);
        if (locksTypedResponse.pages > pageNo) {
          pageNo++;
        } else {
          break; // No more pages to fetch
        }
      } else {
        break; // No more locks to fetch
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
        const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.token, pageNo, pageSize, 0));
        const locksTypedResponse = locksResponse as LockListResponse;
        if (locksTypedResponse?.list) {
          this.allLocks.push(...locksTypedResponse.list)
          this.locksWithoutGroup.push(...locksTypedResponse.list.filter(lock => !lock.groupId))
          if (locksTypedResponse.pages > pageNo) {
            pageNo++;
          } else {
            break; // No more pages to fetch
          }
        } else {
          break; // No more locks to fetch
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
  async getLocksWithoutGroup() {
    let pageNo = 1;
    const pageSize = 100;
    while (true) {
      const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.token, pageNo, pageSize, 0));
      const locksTypedResponse = locksResponse as LockListResponse;
      if (locksTypedResponse?.list) {
        this.locksWithoutGroup.push(...locksTypedResponse.list.filter(lock => !lock.groupId))
        if (locksTypedResponse.pages > pageNo) {
          pageNo++;
        } else {
          break; // No more pages to fetch
        }
      } else {
        break; // No more locks to fetch
      }
    }
    this.groupService.locksWithoutGroup = this.locksWithoutGroup;
  }
  onLockButtonClick(lock: LockData) {
    sessionStorage.setItem('lockID', lock.lockId.toString())
    sessionStorage.setItem('userType', lock.userType)
    sessionStorage.setItem('keyRight', lock.keyRight.toString())
    sessionStorage.setItem('startDate', lock.startDate)
    sessionStorage.setItem('endDate', lock.endDate)
    this.router.navigate(['users', this.username, 'lock', lock.lockId])
  }
  onInvalidButtonClick() {
    this.popupService.invalidLock = true;
  }
  hasValidAccess(lock: LockData): boolean {
    if (Number(lock.endDate) === 0 || moment(lock.endDate).isAfter(moment())) {
      return true
    }
    else {
      return false;
    }
  }
}