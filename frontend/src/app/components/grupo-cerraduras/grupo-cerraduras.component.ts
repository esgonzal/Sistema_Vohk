import { Component, OnInit } from '@angular/core';
import { UserServiceService } from '../../services/user-service.service';
import { GroupService } from '../../services/group.service';
import { PopUpService } from '../../services/pop-up.service';
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
