import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EkeyTableComponent } from './ekey-table.component';

describe('EkeyTableComponent', () => {
  let component: EkeyTableComponent;
  let fixture: ComponentFixture<EkeyTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EkeyTableComponent]
    });
    fixture = TestBed.createComponent(EkeyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
