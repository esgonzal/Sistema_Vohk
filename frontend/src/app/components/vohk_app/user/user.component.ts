import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from 'src/app/services/vohk_app/user.service';
import { SelectedCondominium, SelectedCondominiumService } from 'src/app/services/vohk_app/selected-condominium.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit, OnDestroy {

  users: any[] = [];
  filteredUsers: any[] = [];
  loading = true;
  searchText = '';
  selectedRole = 'Todos';
  selectedCondominium: SelectedCondominium | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private selectedCondominiumService: SelectedCondominiumService
  ) { }

  ngOnInit(): void {
    this.selectedCondominiumService.selected$.pipe(takeUntil(this.destroy$)).subscribe(condo => {
      this.selectedCondominium = condo;
      if (!condo) {
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
        return;
      }
      this.searchText = '';
      this.selectedRole = 'Todos';
      this.loadUsers(condo.condominium_id);
    });
  }
  loadUsers(condominiumId: string): void {
    this.loading = true;
    this.userService.getUsers(condominiumId).subscribe({
      next: data => {
        this.users = data;
        this.filteredUsers = data;
        this.loading = false;
        console.log('Users loaded:', this.users);
      },
      error: err => {
        console.error(err);
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
      }
    });
  }
  getResidentsCount(): number {
    return this.users.filter(u => u.role === 'resident').length;
  }
  getStaffCount(): number {
    return this.users.filter(u => u.role === 'staff').length;
  }
  getGuardsCount(): number {
    return this.users.filter(u => u.role === 'guard').length;
  }
  getAdminsCount(): number {
    return this.users.filter(u => u.role === 'admin').length;
  }
  filterByRole(role: string): void {
    this.selectedRole = role;
    this.applyFilters();
  }
  onSearch(event: any): void {
    this.searchText = event.target.value.toLowerCase();
    this.applyFilters();
  }
  applyFilters(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesRole = this.selectedRole === 'Todos' || user.role === this.selectedRole;
      const text = `${user.legal_name}${user.rut}${user.email}${user.condominium ?? ''}${user.building ?? ''}${user.unit ?? ''}`.toLowerCase();
      const matchesSearch = text.includes(this.searchText);
      return matchesRole && matchesSearch;
    });
  }
  getRoleLabel(role: string): string {
    switch (role) {
      case 'resident':
        return 'Residente';
      case 'staff':
        return 'Personal';
      case 'guard':
        return 'Guardia';
      case 'admin':
        return 'Administrador';
      default:
        return role;
    }
  }
  getLocation(user: any): string {
    if (!user.condominium) {
      return '-';
    }
    return `${user.condominium}${user.building ?? ''}${user.unit ?? ''}`;
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}