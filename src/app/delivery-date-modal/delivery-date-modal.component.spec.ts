import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryDateModalComponent } from './delivery-date-modal.component';

describe('DeliveryDateModalComponent', () => {
  let component: DeliveryDateModalComponent;
  let fixture: ComponentFixture<DeliveryDateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryDateModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryDateModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
