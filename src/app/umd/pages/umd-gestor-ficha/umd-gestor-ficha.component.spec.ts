import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UmdGestorFichaComponent } from './umd-gestor-ficha.component';

describe('UmdGestorFichaComponent', () => {
  let component: UmdGestorFichaComponent;
  let fixture: ComponentFixture<UmdGestorFichaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UmdGestorFichaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UmdGestorFichaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
