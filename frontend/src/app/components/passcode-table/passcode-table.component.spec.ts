import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasscodeTableComponent } from './passcode-table.component';

describe('PasscodeTableComponent', () => {
  let component: PasscodeTableComponent;
  let fixture: ComponentFixture<PasscodeTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PasscodeTableComponent]
    });
    fixture = TestBed.createComponent(PasscodeTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
