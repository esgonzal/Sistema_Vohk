import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CondominiumDashboardComponent } from './condominium-dashboard.component';

describe('CondominiumDashboardComponent', () => {
  let component: CondominiumDashboardComponent;
  let fixture: ComponentFixture<CondominiumDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CondominiumDashboardComponent]
    });
    fixture = TestBed.createComponent(CondominiumDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
