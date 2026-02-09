import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UmdDocenteFichaComponent } from './umd-docente-ficha.component';

describe('UmdDocenteFichaComponent', () => {
  let component: UmdDocenteFichaComponent;
  let fixture: ComponentFixture<UmdDocenteFichaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UmdDocenteFichaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UmdDocenteFichaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
