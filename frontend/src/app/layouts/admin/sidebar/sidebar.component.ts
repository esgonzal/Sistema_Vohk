import { Component } from '@angular/core';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  private readonly isStaff = localStorage.getItem('role') === 'staff';

  generalItems: MenuItem[] = this.isStaff
    ? [{ label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' }]
    : [
        { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
        { label: 'Condominios', route: '/admin/condominiums', icon: 'apartment' }
      ];

  operationItems: MenuItem[] = this.isStaff
    ? [{ label: 'Conserjería', route: '/admin/conserjeria', icon: 'support_agent' }]
    : [
        { label: 'Usuarios', route: '/admin/usuarios', icon: 'group' },
        { label: 'Unidades', route: '/admin/unidades', icon: 'meeting_room' },
        { label: 'Dispositivos', route: '/admin/dispositivos', icon: 'memory' },
        { label: 'Conserjería', route: '/admin/conserjeria', icon: 'support_agent' }
      ];

  intelligenceItems: MenuItem[] = this.isStaff ? [] : [
    { label: 'Alertas IA', route: '/admin/alertas', icon: 'warning', disabled: true },
    { label: 'Trazabilidad', route: '/admin/trazabilidad', icon: 'timeline', disabled: true },
    { label: 'Reportes', route: '/admin/reportes', icon: 'description', disabled: true }
  ];

  systemItems: MenuItem[] = this.isStaff ? [] : [
    { label: 'Configuración', route: '/admin/configuracion', icon: 'settings', disabled: true },
    { label: 'Soporte VÖHK', route: '/admin/soporte', icon: 'help', disabled: true }
  ];

}
