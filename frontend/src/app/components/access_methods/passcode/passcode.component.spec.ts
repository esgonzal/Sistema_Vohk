import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasscodeComponent } from './passcode.component';

describe('PasscodeComponent', () => {
  let component: PasscodeComponent;
  let fixture: ComponentFixture<PasscodeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PasscodeComponent]
    });
    fixture = TestBed.createComponent(PasscodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
