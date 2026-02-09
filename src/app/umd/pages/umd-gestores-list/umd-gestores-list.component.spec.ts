import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UmdGestoresListComponent } from './umd-gestores-list.component';

describe('UmdGestoresListComponent', () => {
  let component: UmdGestoresListComponent;
  let fixture: ComponentFixture<UmdGestoresListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UmdGestoresListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UmdGestoresListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
