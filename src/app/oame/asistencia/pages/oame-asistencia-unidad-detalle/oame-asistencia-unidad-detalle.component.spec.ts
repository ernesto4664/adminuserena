import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OameAsistenciaUnidadDetalleComponent } from './oame-asistencia-unidad-detalle.component';

describe('OameAsistenciaUnidadDetalleComponent', () => {
  let component: OameAsistenciaUnidadDetalleComponent;
  let fixture: ComponentFixture<OameAsistenciaUnidadDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OameAsistenciaUnidadDetalleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OameAsistenciaUnidadDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
