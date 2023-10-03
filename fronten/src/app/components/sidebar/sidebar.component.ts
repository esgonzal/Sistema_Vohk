import { Component } from '@angular/core';
import { GroupService } from '../../services/group.service';
import { Router } from '@angular/router';
import { Group } from '../../Interfaces/Group';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  selectedGroup$: Observable<Group>;

  constructor(public groupService: GroupService, private router: Router) { 
    this.selectedGroup$ = this.groupService.selectedGroup$; 
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
