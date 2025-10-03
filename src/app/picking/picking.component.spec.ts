import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickingComponent } from './picking.component';

describe('PickingComponent', () => {
  let component: PickingComponent;
  let fixture: ComponentFixture<PickingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PickingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PickingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
