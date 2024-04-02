import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Lockv2Component } from './lockv2.component';

describe('Lockv2Component', () => {
  let component: Lockv2Component;
  let fixture: ComponentFixture<Lockv2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Lockv2Component]
    });
    fixture = TestBed.createComponent(Lockv2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
