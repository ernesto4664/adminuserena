import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OameAsistenciaDashboardComponent } from './oame-asistencia-dashboard.component';

describe('OameAsistenciaDashboardComponent', () => {
  let component: OameAsistenciaDashboardComponent;
  let fixture: ComponentFixture<OameAsistenciaDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OameAsistenciaDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OameAsistenciaDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
