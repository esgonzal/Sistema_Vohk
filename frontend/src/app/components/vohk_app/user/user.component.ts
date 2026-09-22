import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from 'src/app/services/vohk_app/user.service';
import { SelectedCondominium, SelectedCondominiumService } from 'src/app/services/vohk_app/selected-condominium.service';
import Swal from 'sweetalert2';
import { formatRut, formatRutInput, isValidRut } from 'src/app/utils/rut';
import * as XLSX from 'xlsx';

interface BulkResidentRow {
  row: number;
  legalName: string;
  rut: string;
  email: string;
  building: string;
  unit: string;
  isPrimary: boolean;
}

interface BulkResidentResult {
  row: number;
  legalName: string;
  success: boolean;
  building?: string;
  unit?: string;
  error?: string;
}

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
  readonly currentRole = localStorage.getItem('role');
  readonly canCreateAdministrators = this.currentRole === 'superadmin';
  readonly canCreateManagementUsers = this.currentRole === 'admin' || this.currentRole === 'superadmin';
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
    if (user.role === 'staff') {
      return 'Todo el condominio';
    }
    if (!user.locations?.length) {
      return '-';
    }
    return [...new Set(user.locations.map((l: any) => l.building))].join(', ');
  }
  getUnitNames(user: any): string {
    if (user.role === 'staff') {
      return 'Todas las unidades';
    }
    if (!user.locations?.length) {
      return '-';
    }
    return user.locations.map((l: any) => l.unit).join(', ');
  }
  async openBulkResidentImport(): Promise<void> {
    if (!this.canCreateManagementUsers || !this.selectedCondominium) {
      return;
    }
    const condominiumId = this.selectedCondominium.condominium_id;
    const selection = await Swal.fire({
      title: 'Carga masiva de residentes',
      html: `
        <div class="bulk-import-copy">
          <p>Sube un archivo Excel con una fila por residente.</p>
          <button id="downloadResidentTemplate" type="button" class="bulk-template-btn">Descargar plantilla Excel</button>
          <label class="bulk-file-picker" for="residentBulkFile">
            <span>Seleccionar archivo</span>
            <small id="residentBulkFileName">Ningún archivo seleccionado</small>
          </label>
          <input id="residentBulkFile" type="file" accept=".xlsx,.xls" hidden>
          <p class="bulk-import-help">Máximo 500 filas. Edificio y unidad deben coincidir con los nombres registrados.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Importar residentes',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      didOpen: () => {
        document.getElementById('downloadResidentTemplate')?.addEventListener('click', () => this.downloadResidentTemplate());
        const fileInput = document.getElementById('residentBulkFile') as HTMLInputElement;
        const fileName = document.getElementById('residentBulkFileName');
        fileInput.addEventListener('change', () => {
          if (fileName) {
            fileName.textContent = fileInput.files?.[0]?.name || 'Ningún archivo seleccionado';
          }
        });
      },
      preConfirm: () => {
        const file = (document.getElementById('residentBulkFile') as HTMLInputElement).files?.[0];
        if (!file) {
          Swal.showValidationMessage('Selecciona un archivo Excel');
          return;
        }
        if (!/\.(xlsx|xls)$/i.test(file.name)) {
          Swal.showValidationMessage('El archivo debe tener formato .xlsx o .xls');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          Swal.showValidationMessage('El archivo no puede superar 5 MB');
          return;
        }
        return file;
      }
    });
    if (!selection.isConfirmed || !(selection.value instanceof File)) {
      return;
    }

    let parsed: { residents: BulkResidentRow[]; failures: BulkResidentResult[] };
    try {
      parsed = await this.parseResidentWorkbook(selection.value);
    } catch (error: any) {
      Swal.fire('Archivo no válido', error.message || 'No se pudo leer el archivo Excel.', 'error');
      return;
    }
    if (parsed.residents.length === 0) {
      this.showBulkImportSummary(parsed.failures);
      return;
    }

    Swal.fire({
      title: 'Importando residentes',
      text: `Procesando ${parsed.residents.length} fila(s)...`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });
    this.userService.createResidentsBulk(condominiumId, parsed.residents).subscribe({
      next: response => {
        this.showBulkImportSummary([...response.results, ...parsed.failures]);
        if (this.selectedCondominium?.condominium_id === condominiumId) {
          this.loadUsers(condominiumId);
        }
      },
      error: err => {
        console.error('Error importing residents:', err);
        Swal.fire('Error', err.error?.error || 'No se pudo realizar la carga masiva.', 'error');
      }
    });
  }
  private downloadResidentTemplate(): void {
    const headers = [['Nombre completo', 'RUT', 'Correo electrónico', 'Edificio', 'Unidad', 'Residente principal']];
    const residentsSheet = XLSX.utils.aoa_to_sheet(headers);
    residentsSheet['!cols'] = [
      { wch: 28 }, { wch: 16 }, { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 22 }
    ];
    const instructionsSheet = XLSX.utils.aoa_to_sheet([
      ['Instrucciones'],
      ['Complete una fila por residente en la hoja Residentes.'],
      ['Use el nombre exacto del edificio y el nombre o número de la unidad.'],
      ['RUT debe incluir dígito verificador. Puede usar puntos y guion.'],
      ['Residente principal acepta Sí/No. Si queda vacío, se considera No.'],
      ['No cambie los encabezados de la primera fila.']
    ]);
    instructionsSheet['!cols'] = [{ wch: 85 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, residentsSheet, 'Residentes');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');
    XLSX.writeFile(workbook, 'plantilla_carga_residentes.xlsx');
  }
  private async parseResidentWorkbook(file: File): Promise<{ residents: BulkResidentRow[]; failures: BulkResidentResult[] }> {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new Error('El archivo no contiene hojas.');
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
    if (rows.length === 0) {
      throw new Error('La primera hoja está vacía.');
    }
    const headers = rows[0].map(value => this.normalizeHeader(value));
    const findColumn = (...names: string[]): number => headers.findIndex(header => names.includes(header));
    const columns = {
      legalName: findColumn('nombre completo', 'nombre', 'residente'),
      rut: findColumn('rut'),
      email: findColumn('correo electronico', 'correo', 'email'),
      building: findColumn('edificio', 'torre'),
      unit: findColumn('unidad', 'departamento', 'numero unidad'),
      isPrimary: findColumn('residente principal', 'principal', 'es principal')
    };
    const requiredColumns: Array<[keyof typeof columns, string]> = [
      ['legalName', 'Nombre completo'], ['rut', 'RUT'], ['email', 'Correo electrónico'],
      ['building', 'Edificio'], ['unit', 'Unidad']
    ];
    const missing = requiredColumns.filter(([key]) => columns[key] < 0).map(([, label]) => label);
    if (missing.length > 0) {
      throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}.`);
    }

    const residents: BulkResidentRow[] = [];
    const failures: BulkResidentResult[] = [];
    for (let index = 1; index < rows.length; index++) {
      const source = rows[index];
      const value = (column: number): string => column < 0 ? '' : String(source[column] ?? '').trim();
      if (source.every(cell => String(cell ?? '').trim() === '')) {
        continue;
      }
      const row = index + 1;
      const legalName = value(columns.legalName);
      const rut = value(columns.rut);
      const email = value(columns.email);
      const building = value(columns.building);
      const unit = value(columns.unit);
      try {
        if (!legalName || !rut || !email || !building || !unit) {
          throw new Error('Faltan datos obligatorios');
        }
        if (!isValidRut(rut)) {
          throw new Error('RUT no válido');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Correo electrónico no válido');
        }
        residents.push({
          row,
          legalName,
          rut: formatRut(rut),
          email,
          building,
          unit,
          isPrimary: this.parsePrimaryResident(value(columns.isPrimary))
        });
      } catch (error: any) {
        failures.push({ row, legalName, success: false, error: error.message || 'Fila no válida' });
      }
    }
    if (residents.length + failures.length === 0) {
      throw new Error('El archivo no contiene residentes.');
    }
    if (residents.length + failures.length > 500) {
      throw new Error('El archivo supera el máximo de 500 residentes.');
    }
    return { residents, failures };
  }
  private normalizeHeader(value: unknown): string {
    return String(value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }
  private parsePrimaryResident(value: string): boolean {
    const normalized = this.normalizeHeader(value);
    if (!normalized || ['no', 'n', 'false', '0'].includes(normalized)) {
      return false;
    }
    if (['si', 's', 'true', '1', 'x', 'principal'].includes(normalized)) {
      return true;
    }
    throw new Error('Residente principal debe ser Sí o No');
  }
  private showBulkImportSummary(results: BulkResidentResult[]): void {
    const succeeded = results.filter(result => result.success).length;
    const failures = results.filter(result => !result.success);
    const failureRows = failures.slice(0, 12).map(result => `
      <tr>
        <td>${result.row}</td>
        <td>${this.escapeHtml(result.legalName || '-')}</td>
        <td>${this.escapeHtml(this.getBulkErrorMessage(result.error))}</td>
      </tr>
    `).join('');
    const remaining = failures.length > 12
      ? `<p class="bulk-more-errors">Hay ${failures.length - 12} error(es) adicional(es).</p>`
      : '';
    Swal.fire({
      title: failures.length === 0 ? 'Carga completada' : 'Carga finalizada con observaciones',
      icon: failures.length === 0 ? 'success' : succeeded > 0 ? 'warning' : 'error',
      html: `
        <p><strong>${succeeded}</strong> residente(s) importado(s). <strong>${failures.length}</strong> fila(s) con error.</p>
        ${failures.length ? `
          <div class="bulk-results-wrap">
            <table class="bulk-results-table">
              <thead><tr><th>Fila</th><th>Residente</th><th>Motivo</th></tr></thead>
              <tbody>${failureRows}</tbody>
            </table>
          </div>${remaining}
        ` : ''}
      `,
      width: failures.length ? 760 : undefined,
      confirmButtonText: 'Entendido'
    });
  }
  private getBulkErrorMessage(error?: string): string {
    const messages: Record<string, string> = {
      'Invalid RUT': 'RUT no válido',
      'Email is already registered': 'El correo ya está registrado',
      'SIP identity is already registered': 'La identidad asociada al RUT ya está registrada',
      'RUT is already registered as a non-resident user': 'El RUT pertenece a una cuenta que no es residente',
      'Unit not found in condominium': 'No se encontró el edificio y la unidad en este condominio',
      'Unit reference is ambiguous': 'La referencia de unidad coincide con más de una unidad',
      'Duplicate resident and unit in file': 'El residente y la unidad están repetidos en el archivo',
      'Missing required fields': 'Faltan datos obligatorios',
      'Invalid email': 'Correo electrónico no válido',
      'Invalid primary resident value': 'Residente principal debe ser Sí o No'
    };
    return messages[error || ''] || error || 'No se pudo crear el residente';
  }
  async openCreateUser(): Promise<void> {
    if (!this.canCreateManagementUsers || !this.selectedCondominium) {
      return;
    }
    const roleOptions = this.canCreateAdministrators
      ? '<option value="staff">Personal</option><option value="admin">Administrador</option>'
      : '<option value="staff">Personal</option>';
    const result = await Swal.fire({
      title: 'Nuevo usuario',
      html: `
        <select id="newUserRole" class="swal2-select" aria-label="Tipo de usuario">
          ${roleOptions}
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
        if (!['admin', 'staff'].includes(role) || (role === 'admin' && !this.canCreateAdministrators)) {
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
        return { legalName, rut: formatRut(rut), email, role };
      }
    });
    if (!result.isConfirmed || !result.value) {
      return;
    }
    const selectedRole = result.value.role as 'admin' | 'staff';
    this.userService.createManagementUser(
      result.value.legalName,
      result.value.rut,
      result.value.email,
      selectedRole,
      selectedRole === 'staff' ? this.selectedCondominium.condominium_id : undefined
    ).subscribe({
      next: response => {
        const username = this.escapeHtml(response.user.username);
        const temporaryPassword = this.escapeHtml(response.temporaryPassword);
        const roleLabel = selectedRole === 'staff' ? 'Personal' : 'Administrador';
        Swal.fire({
          title: `${roleLabel} creado`,
          icon: 'success',
          html: `
            <p>La cuenta fue creada. Guarda estas credenciales antes de cerrar esta ventana.</p>
            <div style="text-align:left; margin:18px auto; max-width:340px">
              <div style="margin-bottom:10px"><strong>Usuario</strong><br><code>${username}</code></div>
              <div><strong>Contraseña temporal</strong><br><code>${temporaryPassword}</code></div>
            </div>
            <small>No se envió ningún correo.${selectedRole === 'staff' ? ' La cuenta quedó asignada al condominio seleccionado.' : ' Al ingresar, el administrador podrá crear sus condominios.'}</small>
          `,
          confirmButtonText: 'Entendido',
          allowOutsideClick: false
        }).then(() => this.loadUsers(this.selectedCondominium!.condominium_id));
      },
      error: err => {
        console.error('Error creating administrator:', err);
        const messages: Record<string, string> = {
          'Invalid RUT': 'El RUT ingresado no es válido.',
          'RUT is already registered': 'El RUT ya está registrado.',
          'Email is already registered': 'El correo electrónico ya está registrado.',
          'SIP identity is already registered': 'La identidad asociada al RUT ya está registrada.',
          'RUT is already registered as a non-resident user': 'El RUT pertenece a una cuenta que no es residente.',
          'Only superadmin can create administrators': 'Solo el superadministrador puede crear administradores.',
          'Only administrators or superadmin can create staff': 'Solo un administrador puede crear personal.',
          'Condominium not found': 'No tienes acceso al condominio seleccionado.'
        };
        const backendMessage = err.error?.error;
        Swal.fire(
          err.status === 409 ? 'No se pudo crear' : 'Error',
          messages[backendMessage] || backendMessage || 'No se pudo crear el usuario.',
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
