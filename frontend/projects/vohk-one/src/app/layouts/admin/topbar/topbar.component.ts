import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/vohk_app/auth.service';
import { SelectedCondominiumService, SelectedCondominium } from 'src/app/services/vohk_app/selected-condominium.service';
import { CondominiumService } from 'src/app/services/vohk_app/condominium.service';
import { TwilioService } from 'src/app/services/vohk_app/twilio.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit {

  condominiums: SelectedCondominium[] = [];
  selectedCondominium: SelectedCondominium | null = null;
  loadingCondominiums = true;
  username = localStorage.getItem('username');
  legalName = localStorage.getItem('legalName');
  role = localStorage.getItem('role');
  userInitials = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private condominiumService: CondominiumService,
    private selectedCondominiumService: SelectedCondominiumService,
    private twilioService: TwilioService
  ) { }

  ngOnInit(): void {
    this.loadCondominiums();
    this.selectedCondominiumService.selected$.subscribe(condo => {
      this.selectedCondominium = condo;
    });
    if (this.legalName) {
      this.userInitials = this.legalName.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase();
    }
  }

  private loadCondominiums(): void {
    this.loadingCondominiums = true;
    this.condominiumService.getCondominiums().subscribe({
      next: (condominiums) => {
        this.condominiums = condominiums;
        this.selectedCondominiumService.restoreFromList(condominiums);
        this.loadingCondominiums = false;
      },
      error: () => {
        this.loadingCondominiums = false;
      }
    });
  }

  selectCondominium(condo: SelectedCondominium): void {
    this.selectedCondominiumService.setSelected(condo);
  }

  logout(): void {
    this.twilioService.shutdown();
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}