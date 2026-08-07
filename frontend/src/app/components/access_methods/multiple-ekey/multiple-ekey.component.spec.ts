import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultipleEkeyComponent } from './multiple-ekey.component';

describe('MultipleEkeyComponent', () => {
  let component: MultipleEkeyComponent;
  let fixture: ComponentFixture<MultipleEkeyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MultipleEkeyComponent]
    });
    fixture = TestBed.createComponent(MultipleEkeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
