import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Loginv2Component } from './loginv2.component';

describe('Loginv2Component', () => {
  let component: Loginv2Component;
  let fixture: ComponentFixture<Loginv2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Loginv2Component]
    });
    fixture = TestBed.createComponent(Loginv2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
