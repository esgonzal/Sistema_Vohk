import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiplePasscodeComponent } from './multiple-passcode.component';

describe('MultiplePasscodeComponent', () => {
  let component: MultiplePasscodeComponent;
  let fixture: ComponentFixture<MultiplePasscodeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MultiplePasscodeComponent]
    });
    fixture = TestBed.createComponent(MultiplePasscodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
