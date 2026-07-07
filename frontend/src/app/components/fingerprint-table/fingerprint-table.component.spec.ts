import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FingerprintTableComponent } from './fingerprint-table.component';

describe('FingerprintTableComponent', () => {
  let component: FingerprintTableComponent;
  let fixture: ComponentFixture<FingerprintTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FingerprintTableComponent]
    });
    fixture = TestBed.createComponent(FingerprintTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
