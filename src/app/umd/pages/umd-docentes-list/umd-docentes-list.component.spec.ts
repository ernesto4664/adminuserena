import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UmdDocentesListComponent } from './umd-docentes-list.component';

describe('UmdDocentesListComponent', () => {
  let component: UmdDocentesListComponent;
  let fixture: ComponentFixture<UmdDocentesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UmdDocentesListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UmdDocentesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
