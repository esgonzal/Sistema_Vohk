import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Comunidadesv2Component } from './comunidadesv2.component';

describe('Comunidadesv2Component', () => {
  let component: Comunidadesv2Component;
  let fixture: ComponentFixture<Comunidadesv2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Comunidadesv2Component]
    });
    fixture = TestBed.createComponent(Comunidadesv2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
