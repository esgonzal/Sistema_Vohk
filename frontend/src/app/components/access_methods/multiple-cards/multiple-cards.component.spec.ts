import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultipleCardsComponent } from './multiple-cards.component';

describe('MultipleCardsComponent', () => {
  let component: MultipleCardsComponent;
  let fixture: ComponentFixture<MultipleCardsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MultipleCardsComponent]
    });
    fixture = TestBed.createComponent(MultipleCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
