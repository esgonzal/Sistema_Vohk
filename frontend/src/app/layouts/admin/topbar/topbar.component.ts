import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/vohk_app/auth.service';
import { SelectedCondominiumService, SelectedCondominium } from 'src/app/services/vohk_app/selected-condominium.service';
import { PropertyService } from 'src/app/services/vohk_app/property.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit {

  condominiums: SelectedCondominium[] = [];
  selectedCondominium: SelectedCondominium | null = null;
  loadingCondominiums = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private propertyService: PropertyService,
    private selectedCondominiumService: SelectedCondominiumService
  ) { }

  ngOnInit(): void {
    this.loadCondominiums();
    this.selectedCondominiumService.selected$.subscribe(condo => {
      this.selectedCondominium = condo;
    });
  }

  private loadCondominiums(): void {
    this.loadingCondominiums = true;
    this.propertyService.getCondominiums().subscribe({
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
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}