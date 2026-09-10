import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from 'src/app/services/vohk_app/user.service';
import { SelectedCondominium, SelectedCondominiumService } from 'src/app/services/vohk_app/selected-condominium.service';
import Swal from 'sweetalert2';
import { formatRut, formatRutInput, isValidRut } from 'src/app/utils/rut';

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
  readonly canCreateAdministrators = localStorage.getItem('role') === 'superadmin';
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
      const locations = (user.locations ?? []).map((l: any) => `${l.building} ${l.unit} ${l.roomNo}`).join(' ');
      const text = `${user.legal_name} ${user.rut} ${user.email} ${locations}`.toLowerCase();
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
  getBuildingNames(user: any): string {
    if (!user.locations?.length) {
      return '-';
    }
    return [...new Set(user.locations.map((l: any) => l.building))].join(', ');
  }
  getUnitNames(user: any): string {
    if (!user.locations?.length) {
      return '-';
    }
    return user.locations.map((l: any) => l.unit).join(', ');
  }
  async openCreateUser(): Promise<void> {
    if (!this.canCreateAdministrators) {
      return;
    }
    const result = await Swal.fire({
      title: 'Nuevo usuario',
      html: `
        <select id="newUserRole" class="swal2-select" aria-label="Tipo de usuario">
          <option value="admin">Administrador</option>
        </select>
        <input id="newUserLegalName" class="swal2-input" placeholder="Nombre completo" autocomplete="name">
        <input id="newUserRut" class="swal2-input" placeholder="12.345.678-5" maxlength="12" autocomplete="off">
        <input id="newUserEmail" type="email" class="swal2-input" placeholder="Correo electrónico" autocomplete="email">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Crear usuario',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const input = document.getElementById('newUserRut') as HTMLInputElement;
        input.addEventListener('input', () => formatRutInput(input));
      },
      preConfirm: () => {
        const role = (document.getElementById('newUserRole') as HTMLSelectElement).value;
        const legalName = (document.getElementById('newUserLegalName') as HTMLInputElement).value.trim();
        const rut = (document.getElementById('newUserRut') as HTMLInputElement).value.trim();
        const email = (document.getElementById('newUserEmail') as HTMLInputElement).value.trim();
        if (role !== 'admin') {
          Swal.showValidationMessage('El tipo de usuario no es válido');
          return;
        }
        if (!legalName || !rut || !email) {
          Swal.showValidationMessage('Nombre, RUT y correo son obligatorios');
          return;
        }
        if (!isValidRut(rut)) {
          Swal.showValidationMessage('Ingresa un RUT válido');
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          Swal.showValidationMessage('Ingresa un correo electrónico válido');
          return;
        }
        return { legalName, rut: formatRut(rut), email };
      }
    });
    if (!result.isConfirmed || !result.value) {
      return;
    }
    this.userService.createAdministrator(
      result.value.legalName,
      result.value.rut,
      result.value.email
    ).subscribe({
      next: response => {
        const username = this.escapeHtml(response.user.username);
        const temporaryPassword = this.escapeHtml(response.temporaryPassword);
        Swal.fire({
          title: 'Administrador creado',
          icon: 'success',
          html: `
            <p>La cuenta fue creada. Guarda estas credenciales antes de cerrar esta ventana.</p>
            <div style="text-align:left; margin:18px auto; max-width:340px">
              <div style="margin-bottom:10px"><strong>Usuario</strong><br><code>${username}</code></div>
              <div><strong>Contraseña temporal</strong><br><code>${temporaryPassword}</code></div>
            </div>
            <small>No se envió ningún correo. Al ingresar, el administrador podrá crear sus condominios.</small>
          `,
          confirmButtonText: 'Entendido',
          allowOutsideClick: false
        });
      },
      error: err => {
        console.error('Error creating administrator:', err);
        const messages: Record<string, string> = {
          'Invalid RUT': 'El RUT ingresado no es válido.',
          'RUT is already registered': 'El RUT ya está registrado.',
          'Email is already registered': 'El correo electrónico ya está registrado.',
          'SIP identity is already registered': 'La identidad asociada al RUT ya está registrada.',
          'RUT is already registered as a non-resident user': 'El RUT pertenece a una cuenta que no es residente.',
          'Only superadmin can create administrators': 'Solo el superadministrador puede crear administradores.'
        };
        const backendMessage = err.error?.error;
        Swal.fire(
          err.status === 409 ? 'No se pudo crear' : 'Error',
          messages[backendMessage] || backendMessage || 'No se pudo crear el administrador.',
          err.status === 409 ? 'warning' : 'error'
        );
      }
    });
  }
  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
