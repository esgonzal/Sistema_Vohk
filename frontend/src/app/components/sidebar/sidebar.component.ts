import { Component } from '@angular/core';
import { GroupService } from '../../services/group.service';
import { Router } from '@angular/router';
import { Group } from '../../Interfaces/Group';
import { Observable, lastValueFrom } from 'rxjs';
import { UserServiceService } from '../../services/user-service.service';
import { GroupResponse, LockListResponse } from '../../Interfaces/API_responses';
import { EkeyServiceService } from '../../services/ekey-service.service';
import { LockData } from '../../Interfaces/Lock';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  selectedGroup$: Observable<Group>;
  isLoading: boolean;
  username = sessionStorage.getItem('user') ?? '';
  userID: string;
  groups: Group[] = [];
  locksWithoutGroup: LockData[] = [];

  constructor(public groupService: GroupService, private router: Router, private userService: UserServiceService, private ekeyService: EkeyServiceService) {
    this.selectedGroup$ = this.groupService.selectedGroup$;
  }

  async ngOnInit() {
    this.userID = this.username
    await this.fetchGroups();
  }

  async fetchGroups() {
    this.isLoading = true;
    try {
      const typedResponse = await lastValueFrom(this.groupService.getGroupofAccount(this.userID)) as GroupResponse;
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
      const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, group.groupId));
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
  async getLocksWithoutGroup() {
    let pageNo = 1;
    const pageSize = 100;
    while (true) {
      const locksResponse = await lastValueFrom(this.ekeyService.getEkeysofAccount(this.userID, pageNo, pageSize, 0));
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

  selectGroup(group: Group) {
    if (group.groupName === 'Todos') {
      this.groupService.updateSelectedGroup(this.groupService.DEFAULT_GROUP);
    } else {
      this.groupService.updateSelectedGroup(group);
    }
    this.router.navigate(['users', sessionStorage.getItem('user')]);
  }
  toGrupoCerraduras() {
    this.router.navigate(['/users/', sessionStorage.getItem('user'), 'grupos']);
  }
}
