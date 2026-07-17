import { Component } from '@angular/core';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  generalItems: MenuItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Condominios', route: '/admin/condominiums', icon: 'apartment' }
  ];

  operationItems: MenuItem[] = [
    { label: 'Usuarios', route: '/admin/usuarios', icon: 'group' },
    { label: 'Unidades', route: '/admin/unidades', icon: 'meeting_room' },
    { label: 'Controles de Acceso', route: '/admin/accesos', icon: 'door_front' },
    { label: 'Dispositivos', route: '/admin/dispositivos', icon: 'memory' },
    { label: 'Citofonía', route: '/admin/citofonia', icon: 'call' },
    { label: 'Conserjería', route: '/admin/conserjeria', icon: 'support_agent' }
  ];

  intelligenceItems: MenuItem[] = [
    { label: 'Alertas IA', route: '/admin/alertas', icon: 'warning' },
    { label: 'Trazabilidad', route: '/admin/trazabilidad', icon: 'timeline' },
    { label: 'Reportes', route: '/admin/reportes', icon: 'description' }
  ];

  systemItems: MenuItem[] = [
    { label: 'Configuración', route: '/admin/configuracion', icon: 'settings' },
    { label: 'Soporte VÖHK', route: '/admin/soporte', icon: 'help' }
  ];

}