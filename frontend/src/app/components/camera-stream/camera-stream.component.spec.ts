import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraStreamComponent } from './camera-stream.component';

describe('CameraStreamComponent', () => {
  let component: CameraStreamComponent;
  let fixture: ComponentFixture<CameraStreamComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CameraStreamComponent]
    });
    fixture = TestBed.createComponent(CameraStreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
