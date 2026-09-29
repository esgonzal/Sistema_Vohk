import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConserjeriaComponent } from './conserjeria.component';

describe('ConserjeriaComponent', () => {
  let component: ConserjeriaComponent;
  let fixture: ComponentFixture<ConserjeriaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConserjeriaComponent]
    });
    fixture = TestBed.createComponent(ConserjeriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
