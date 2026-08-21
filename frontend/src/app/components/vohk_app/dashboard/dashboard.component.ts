import { Component, OnInit } from '@angular/core';
import { DashboardService } from 'src/app/services/vohk_app/dashboard.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

export class DashboardComponent implements OnInit {

  dashboard: any;
  cards: any[] = [];
  activities: any[] = [];
  loading = true;
  activityPage = 0;
  activityPageSize = 5;
  activityPageSizeOptions = [5, 10, 20];

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard() {
    forkJoin({
      dashboard: this.dashboardService.getDashboard(),
      activities: this.dashboardService.getActivities()
    })
      .subscribe({
        next: data => {
          this.dashboard = data.dashboard;
          this.activities = data.activities;
          console.log('Dashboard:', this.dashboard);
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });
  }

  activityTitle(activity: any): string {
    if (activity.event_type === 'door_open') {
      return `${activity.actor_name || 'Usuario'} abrió ${activity.device_name || 'un acceso'}`;
    }
    const participants = activity.participants ?? [];
    const caller = participants.find((item: any) => item.role === 'caller')?.name || activity.actor_name;
    const recipient = participants.find((item: any) => item.role === 'recipient')?.name;
    if (caller && recipient) return `${caller} llamó a ${recipient}`;
    if (caller && activity.device_name) return `${caller} llamó a ${activity.device_name}`;
    if (recipient && activity.device_name) return `${activity.device_name} llamó a ${recipient}`;
    return 'Llamada registrada';
  }

  activityStatus(status: string): string {
    const labels: Record<string, string> = {
      initiated: 'Iniciada', ringing: 'Sonando', answered: 'Contestada', completed: 'Finalizada',
      'no-answer': 'Sin respuesta', busy: 'Ocupado', failed: 'Fallida', canceled: 'Cancelada', succeeded: 'Realizado'
    };
    return labels[status] || status;
  }

  get pagedActivities(): any[] {
    const start = this.activityPage * this.activityPageSize;
    return this.activities.slice(start, start + this.activityPageSize);
  }

  get activityTotalPages(): number {
    return Math.max(1, Math.ceil(this.activities.length / this.activityPageSize));
  }

  get activityStart(): number {
    if (!this.activities.length) return 0;
    return this.activityPage * this.activityPageSize + 1;
  }

  get activityEnd(): number {
    return Math.min(
      (this.activityPage + 1) * this.activityPageSize,
      this.activities.length
    );
  }

  previousActivityPage(): void {
    if (this.activityPage > 0) {
      this.activityPage--;
    }
  }

  nextActivityPage(): void {
    if (this.activityPage + 1 < this.activityTotalPages) {
      this.activityPage++;
    }
  }

  changeActivityPageSize(value: string): void {
    this.activityPageSize = Number(value);
    this.activityPage = 0;
  }
}
