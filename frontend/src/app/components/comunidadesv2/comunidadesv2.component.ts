import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { addGroupResponse, EkeyResponse, GroupResponse, LockListResponse, operationResponse } from 'src/app/Interfaces/API_responses';
import { Group } from 'src/app/Interfaces/Group';
import { LockData } from 'src/app/Interfaces/Lock';
import { EkeyServiceService } from 'src/app/services/ekey-service.service';
import { GroupService } from 'src/app/services/group.service';
import { PopUpService } from 'src/app/services/pop-up.service';
import { DarkModeService } from '../../services/dark-mode.service';
import { LockServiceService } from 'src/app/services/lock-service.service';
import { faHome } from '@fortawesome/free-solid-svg-icons'
import { Ekey } from 'src/app/Interfaces/Elements';
import * as XLSX from 'xlsx';
import { PasscodeServiceService } from 'src/app/services/passcode-service.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-comunidadesv2',
  templateUrl: './comunidadesv2.component.html',
  styleUrls: ['./comunidadesv2.component.css']
})
export class Comunidadesv2Component implements OnInit {

  faHome = faHome;
  isLoading: boolean = false;
  accessToken = sessionStorage.getItem('accessToken') ?? '';
  groups: Group[] = [];
  groupsFiltrados: Group[] = [];
  locksWithoutGroup: LockData[] = [];
  visibleGroups: { [groupId: string]: boolean } = {};
  cols: number = 4;
  chosenGroup: Group
  darkMode: boolean;
  searchText: string = '';

  constructor(private groupService: GroupService,
    private ekeyService: EkeyServiceService,
    private passcodeService: PasscodeServiceService,
    private lockService: LockServiceService,
    private router: Router,
    public popupService: PopUpService,
    public DarkModeService: DarkModeService) {
    this.updateCols();
  }
  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.groupService.fetchAll(this.accessToken)) as GroupResponse;
      if (response.list) {
        this.groups = response.list;
        this.groupsFiltrados = response.list;
        this.groupService.groups = response.list;
        const savedGroupId = Number(sessionStorage.getItem('lockGroupID'));
        this.chosenGroup = this.groups.find(g => g.groupId === savedGroupId) ?? this.groups.find(g => g.groupId === -1) ?? this.groups[0];
        if (this.chosenGroup?.groupId === -1) {
          this.popupService.locksWithoutGroup = this.chosenGroup.locks;
        }
      } else if (response.errcode === 10003) {
        sessionStorage.clear();
      }
    } catch (error) {
      console.error('Error while fetching groups:', error);
    } finally {
      console.log('Groups fetched:', this.groups);
      this.isLoading = false;
    }
  }
  chooseGroup(group: Group) {
    this.chosenGroup = group;
    if (group.groupId === -1) {
      this.popupService.locksWithoutGroup = group.locks;
    }
  }
  async crearGrupo() {
    const result = await Swal.fire({
      title: 'Crear grupo',
      input: 'text',
      inputLabel: 'Nombre',
      inputPlaceholder: 'Ingrese el nombre del grupo',
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed || !result.value) {
      return;
    }
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.groupService.addGroup(this.accessToken, result.value)) as addGroupResponse;
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'Grupo creado' });
        await this.ngOnInit();
      } else {
        await Swal.fire({ icon: 'error', title: 'No se pudo crear el grupo', text: response.errmsg });
      }
    } finally {
      this.isLoading = false;
    }
  }
  async cambiarNombre(groupID: number) {
    const result = await Swal.fire({
      title: 'Cambiar nombre',
      input: 'text',
      inputLabel: 'Nuevo nombre',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed || !result.value) {
      return;
    }
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.groupService.renameGroup(this.accessToken, groupID.toString(), result.value)) as operationResponse;
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'Nombre actualizado' });
        await this.ngOnInit();
      } else {
        await Swal.fire({ icon: 'error', title: 'Error', text: response.errmsg });
      }
    } finally {
      this.isLoading = false;
    }
  }
  async eliminar(groupID: number) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar grupo',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });
    if (!result.isConfirmed) {
      return;
    }
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.groupService.deleteGroup(this.accessToken, groupID.toString())) as operationResponse;
      if (response.errcode === 0) {
        await Swal.fire({ icon: 'success', title: 'Grupo eliminado' });
        await this.ngOnInit();
      } else {
        await Swal.fire({ icon: 'error', title: 'Error', text: response.errmsg });
      }
    } finally {
      this.isLoading = false;
    }
  }
  async agregar(group: Group) {
    const locks = this.popupService.locksWithoutGroup ?? [];
    let selected: { id: number; alias: string }[] = [];
    const html = `
    <div style="max-height:300px; overflow:auto; text-align:left;">
      ${locks.map(lock => `
        <label style="display:block; margin:6px 0;">
          <input type="checkbox" data-id="${lock.lockId}" data-alias="${lock.lockAlias}"> ${lock.lockAlias}
        </label>
      `).join('')}
    </div>`;
    const result = await Swal.fire({
      title: `Agregar cerraduras a ${group.groupName}`,
      html,
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const checkboxes = Swal.getHtmlContainer()?.querySelectorAll('input[type="checkbox"]');
        selected = [];
        checkboxes?.forEach((cb: any) => {
          if (cb.checked) {
            selected.push({ id: Number(cb.dataset.id), alias: cb.dataset.alias });
          }
        });
        return selected;
      }
    });
    if (!result.isConfirmed || !selected.length) return;
    this.isLoading = true;
    try {
      for (const lock of selected) {
        await lastValueFrom(this.groupService.setGroupofLock(this.accessToken, lock.id.toString(), group.groupId.toString()));
      }
    } finally {
      this.isLoading = false;
    }
    await Swal.fire({ icon: 'success', title: 'Cerraduras agregadas' });
    await this.ngOnInit();
  }
  async remover(group: Group) {
    const locks = group.locks ?? [];
    let selected: { id: number; alias: string }[] = [];
    const html = `
    <div style="max-height:300px; overflow:auto; text-align:left;">
      ${locks.map(lock => `
        <label style="display:block; margin:6px 0;">
          <input type="checkbox" data-id="${lock.lockId}" data-alias="${lock.lockAlias}"> ${lock.lockAlias}
        </label>
      `).join('')}
    </div>`;
    const result = await Swal.fire({
      title: `Remover cerraduras de ${group.groupName}`,
      html,
      showCancelButton: true,
      confirmButtonText: 'Remover',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const checkboxes = Swal.getHtmlContainer()?.querySelectorAll('input[type="checkbox"]');
        selected = [];
        checkboxes?.forEach((cb: any) => {
          if (cb.checked) {
            selected.push({ id: Number(cb.dataset.id), alias: cb.dataset.alias });
          }
        });
        return selected;
      }
    });
    if (!result.isConfirmed || !selected.length) return;
    this.isLoading = true;
    try {
      for (const lock of selected) {
        await lastValueFrom(this.groupService.setGroupofLock(this.accessToken, lock.id.toString(), "0"));
      }
    } finally {
      this.isLoading = false;
    }
    await Swal.fire({ icon: 'success', title: 'Cerraduras removidas' });
    await this.ngOnInit();
  }
  searchGroups() {
    this.groupsFiltrados = this.groups.filter(group =>
      group.groupName.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }
  hasValidAccess(lock: LockData): boolean {
    if ((Number(lock.endDate) === 0 || moment(lock.endDate).isAfter(moment())) && (lock.userType === '110301' || (lock.userType === '110302' && lock.keyRight === 1))) {
      return true
    } else {
      return false;
    }
  }
  onLockButtonClick(lock: LockData) {
    if (!this.hasValidAccess(lock)) {
      this.onInvalidButtonClick();
      return;
    }
    sessionStorage.setItem('lockID', lock.lockId.toString());
    sessionStorage.setItem('keyID', lock.keyId.toString());
    sessionStorage.setItem('userType', lock.userType);
    sessionStorage.setItem('keyRight', lock.keyRight.toString());
    sessionStorage.setItem('startDate', lock.startDate);
    sessionStorage.setItem('endDate', lock.endDate);
    sessionStorage.setItem('lockAlias', lock.lockAlias);
    sessionStorage.setItem('lockBatery', lock.electricQuantity.toString());
    sessionStorage.setItem('lockGateway', lock.hasGateway.toString());
    sessionStorage.setItem('lockFeature', lock.featureValue.toString());
    const group = lock.groupId ? { name: lock.groupName, id: lock.groupId.toString() } : { name: 'Sin Asociar', id: '-1' };
    sessionStorage.setItem('lockGroup', group.name);
    sessionStorage.setItem('lockGroupID', group.id);
    this.router.navigate(['lock', lock.lockId]);
  }
  onInvalidButtonClick() {
    Swal.fire({
      icon: 'error',
      title: 'Acceso denegado',
      text: 'No tiene permiso para acceder a esta cerradura. Comuníquese con el administrador.',
      confirmButtonText: 'Ok'
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.updateCols(); // Update cols value on resize
  }
  private updateCols() {
    const screenWidth = window.innerWidth;
    const imageWidthWithMargin = 220; // 200px width + 10px margin
    if (screenWidth <= 600) { // Mobile breakpoint
      //const numColumns = Math.floor(screenWidth / (imageWidthWithMargin / 2)); // Adjusting for smaller cards on mobile
      this.cols = 2;
    } else {
      const numColumns = Math.min(Math.floor(screenWidth / imageWidthWithMargin), 4); // Maximum of 4 columns on larger screens
      this.cols = numColumns;
    }
  }
}
