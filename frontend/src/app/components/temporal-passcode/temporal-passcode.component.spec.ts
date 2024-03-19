import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemporalPasscodeComponent } from './temporal-passcode.component';

describe('TemporalPasscodeComponent', () => {
  let component: TemporalPasscodeComponent;
  let fixture: ComponentFixture<TemporalPasscodeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TemporalPasscodeComponent]
    });
    fixture = TestBed.createComponent(TemporalPasscodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
