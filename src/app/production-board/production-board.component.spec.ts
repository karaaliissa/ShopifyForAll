import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionBoardComponent } from './production-board.component';

describe('ProductionBoardComponent', () => {
  let component: ProductionBoardComponent;
  let fixture: ComponentFixture<ProductionBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionBoardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
