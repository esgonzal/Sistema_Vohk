import { Component, OnInit } from '@angular/core';
import { DashboardService } from 'src/app/services/vohk_app/dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

export class DashboardComponent implements OnInit {

  dashboard: any;
  cards: any[] = [];
  loading = true;

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard() {
    this.dashboardService.getDashboard()
      .subscribe({
        next: data => {
          this.dashboard = data;
          console.log('Dashboard:', this.dashboard);
        },
        error: err => {
          console.error(err);
        }
      });
  }
}