import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferHubComponent } from './transfer-hub.component';

describe('TransferHubComponent', () => {
  let component: TransferHubComponent;
  let fixture: ComponentFixture<TransferHubComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TransferHubComponent]
    });
    fixture = TestBed.createComponent(TransferHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
