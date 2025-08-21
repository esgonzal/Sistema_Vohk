import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunctionsModalComponent } from './functions-modal.component';

describe('FunctionsModalComponent', () => {
  let component: FunctionsModalComponent;
  let fixture: ComponentFixture<FunctionsModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FunctionsModalComponent]
    });
    fixture = TestBed.createComponent(FunctionsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
