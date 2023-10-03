import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrupoCerradurasComponent } from './grupo-cerraduras.component';

describe('GrupoCerradurasComponent', () => {
  let component: GrupoCerradurasComponent;
  let fixture: ComponentFixture<GrupoCerradurasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GrupoCerradurasComponent]
    });
    fixture = TestBed.createComponent(GrupoCerradurasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
