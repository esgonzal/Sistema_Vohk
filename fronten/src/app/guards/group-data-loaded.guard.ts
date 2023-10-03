import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GroupService } from '../services/group.service';

@Injectable({
  providedIn: 'root',
})
export class GroupDataLoadedGuard implements CanActivate {
  constructor(private groupService: GroupService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | Observable<boolean> {
    if (this.groupService.groups.length === 0) {
      this.router.navigate(['users', localStorage.getItem('user') ?? ''])
      return false; // Return false to prevent activation until data is loaded
    }
    return true; // Activate the route if data is loaded
  }
}