import {
  AfterViewInit,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

import { UmdService } from '../../data/umd.service';
import { UmdGestorListItem } from '../../data/umd.types';

@Component({
  selector: 'app-umd-gestores-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
  ],
  templateUrl: './umd-gestores-list.component.html',
  styleUrl: './umd-gestores-list.component.scss',
})
export class UmdGestoresListComponent implements AfterViewInit {
  private api = inject(UmdService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  anioCtrl = new FormControl<number>(2025, { nonNullable: true });
  qCtrl = new FormControl<string>('', { nonNullable: true });
  unidadNombreCtrl = new FormControl<string>('', { nonNullable: true });

  page = signal(1);
  perPage = signal(20);

  total = signal(0);
  lastPage = signal(1);

  loading = signal(false);
  error = signal<string | null>(null);

  rows = signal<UmdGestorListItem[]>([]);

  displayedColumns = ['id', 'nombre', 'rut', 'unidad', 'acciones'];

  pages = computed<number[]>(() => {
    const last = this.lastPage();
    const current = this.page();
    const window = 5;

    if (last <= window) return Array.from({ length: last }, (_, i) => i + 1);

    let start = Math.max(1, current - 2);
    let end = start + window - 1;

    if (end > last) {
      end = last;
      start = end - window + 1;
    }

    return Array.from({ length: window }, (_, i) => start + i);
  });

  ngAfterViewInit(): void {
    this.anioCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.cargar();
      });

    this.unidadNombreCtrl.valueChanges
      .pipe(
        map(v => (v ?? '').trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(v => {
        if (v !== this.unidadNombreCtrl.value) {
          this.unidadNombreCtrl.setValue(v, { emitEvent: false });
        }
        this.page.set(1);
        this.cargar();
      });

    this.qCtrl.valueChanges
      .pipe(
        map(v => (v ?? '').trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(v => {
        if (v !== this.qCtrl.value) {
          this.qCtrl.setValue(v, { emitEvent: false });
        }
        this.page.set(1);
        this.cargar();
      });

    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getGestores({
      anio: this.anioCtrl.value,
      q: this.qCtrl.value.trim() || undefined,
      unidad: this.unidadNombreCtrl.value.trim() || undefined, // 👈 CLAVE
      page: this.page(),
      per_page: this.perPage(),
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: res => {
        this.rows.set(res?.data ?? []);
        this.total.set(res?.meta?.total ?? this.rows().length);
        this.lastPage.set(res?.meta?.last_page ?? 1);
        if (this.page() > this.lastPage()) this.page.set(this.lastPage());
        this.loading.set(false);
      },
      error: err => {
        this.rows.set([]);
        this.total.set(0);
        this.lastPage.set(1);
        this.error.set(err?.message ?? 'Error cargando gestores');
        this.loading.set(false);
      }
    });
  }

  volver(): void {
    this.router.navigate(['/umd/dashboard'], { queryParamsHandling: 'merge' });
  }

  goToPage(p: number){ if(p!==this.page()) { this.page.set(p); this.cargar(); } }
  prevPage(){ if(this.page()>1){ this.page.set(this.page()-1); this.cargar(); } }
  nextPage(){ if(this.page()<this.lastPage()){ this.page.set(this.page()+1); this.cargar(); } }

  getId(r:any){ return String(r?.id_usuario ?? r?.id ?? '—'); }
  getNombre(r:any){ return String(r?.nombre ?? r?.nombre_completo ?? '—'); }
  getRut(r:any){ return String(r?.rut ?? '—'); }
  getUnidad(r:any){ return String(r?.unidad_nombre ?? r?.unidad ?? '—'); }

  abrirFicha(r:any){
    const id = Number(r?.id_usuario ?? r?.id);
    if(id) this.router.navigate(['/umd/gestores', id], { queryParams: { anio: this.anioCtrl.value } });
  }
}
