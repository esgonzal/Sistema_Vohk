import { Component, OnInit } from '@angular/core';
import { UserServiceService } from '../../services/user-service.service';
import { GroupService } from '../../services/group.service';
import { PopUpService } from '../../services/pop-up.service';
import { LockData } from '../../Interfaces/Lock';
import { Group } from '../../Interfaces/Group';
import { lastValueFrom } from 'rxjs';
import { LockListResponse } from 'src/app/Interfaces/API_responses';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { Router } from '@angular/router';

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
    public groupService: GroupService,
    public popupService: PopUpService,
    private ekeyService: EkeyServiceService,
    private router: Router
  ) { }

  async ngOnInit() {
    this.userID = this.username
    await this.getAllLocks();
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
          this.router.navigate(['login'])
        }
        else {
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
}
