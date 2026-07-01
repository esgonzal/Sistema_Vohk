import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TtlockComponent } from './ttlock.component';

describe('TtlockComponent', () => {
  let component: TtlockComponent;
  let fixture: ComponentFixture<TtlockComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TtlockComponent]
    });
    fixture = TestBed.createComponent(TtlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
