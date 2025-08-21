import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassageModeComponent } from './passage-mode.component';

describe('PassageModeComponent', () => {
  let component: PassageModeComponent;
  let fixture: ComponentFixture<PassageModeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PassageModeComponent]
    });
    fixture = TestBed.createComponent(PassageModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
