import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LockData, } from '../../Interfaces/Lock';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { faBatteryFull, faBatteryThreeQuarters, faBatteryHalf, faBatteryQuarter, faBatteryEmpty, faGear, faWifi } from '@fortawesome/free-solid-svg-icons'
import { PopUpService } from '../../services/pop-up.service';
import { GroupService } from '../../services/group.service';
import { Subscription } from 'rxjs';
import { Group, } from '../../Interfaces/Group';
import { LockListResponse } from '../../Interfaces/API_responses'
import moment from 'moment';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { UserServiceService } from '../../services/user-service.service';
import { LockServiceService } from 'src/app/services/lock-service.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css'],
  providers: []
})
export class UserComponent implements OnInit {

  constructor(private router: Router, 
              public groupService: GroupService, 
              private ekeyService: EkeyServiceService, 
              public popupService: PopUpService, 
              private userService: UserServiceService,
              private lockService: LockServiceService) { }

  username = sessionStorage.getItem('user') ?? '';
  userID: string;
  isLoading: boolean = false;
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

  async ngOnInit() {
    this.userID = this.username
    //await this.getAllLocks();
    this.fetchLocks(Number(sessionStorage.getItem('group')));
    const filteredLocks = this.allLocks
      .filter((lock) => lock.userType === '110301' || (lock.userType === '110302' && lock.keyRight === 1))
      .map(({ lockId, lockAlias }) => ({ lockId, lockAlias }));
    this.lockService.filteredLocks = filteredLocks;
    //console.log('Filtered locks:', filteredLocks);
    //console.log('All locks:', this.allLocks);
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
  }
  async fetchLocksPage(pageNo: number, groupId?: number) {
    this.locks = [];
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, 100, groupId));
      const typedResponse = response as LockListResponse;
      if (typedResponse?.list) {
        this.locks.push(...typedResponse.list);
        if (typedResponse.pages > pageNo) {
          await this.fetchLocksPage(pageNo + 1, groupId);
        }
      } else if (typedResponse.errcode === 10003){
        sessionStorage.clear();
      } else {
        console.log("Locks not yet available")
      }
    } catch (error) {
      console.error("Error while fetching locks page:", error)
    } finally {
      this.isLoading = false; // Set isLoading to false when data fetching is complete
    }
    //console.log("Locks actuales", this.locks)
    //console.log("all locks:", this.allLocks)
    //console.log("locks sin grupo:", this.locksWithoutGroup)
  }
  async getAllLocks() {
    this.isLoading = true;
    try {
      let pageNo = 1;
      const pageSize = 100;
      while (true) {
        const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, 0));
        const locksTypedResponse = locksResponse as LockListResponse;
        if (locksTypedResponse?.list) {
          this.allLocks.push(...locksTypedResponse.list)
          this.locksWithoutGroup.push(...locksTypedResponse.list.filter(lock => !lock.groupId))
          if (locksTypedResponse.pages > pageNo) {
            pageNo++;
          } else {
            break; // No more pages to fetch
          }
        } else if (locksTypedResponse.errcode === 10003) {
          sessionStorage.clear;
          break;
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
    this.router.navigate(['users', this.username, 'lock', lock.lockId])
  }
  onInvalidButtonClick() {
    this.popupService.invalidLock = true;
  }
  hasValidAccess(lock: LockData): boolean {
    if ( (Number(lock.endDate) === 0 || moment(lock.endDate).isAfter(moment())) && (lock.userType=== '110301' || (lock.userType=== '110302' && lock.keyRight===1)) ) {
      return true
    } else {
      return false;
    }
  }
}