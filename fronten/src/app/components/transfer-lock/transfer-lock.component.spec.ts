import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferLockComponent } from './transfer-lock.component';

describe('TransferLockComponent', () => {
  let component: TransferLockComponent;
  let fixture: ComponentFixture<TransferLockComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TransferLockComponent]
    });
    fixture = TestBed.createComponent(TransferLockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
