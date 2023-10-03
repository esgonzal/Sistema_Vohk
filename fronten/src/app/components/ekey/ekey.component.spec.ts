import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EkeyComponent } from './ekey.component';

describe('EkeyComponent', () => {
  let component: EkeyComponent;
  let fixture: ComponentFixture<EkeyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EkeyComponent]
    });
    fixture = TestBed.createComponent(EkeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
