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
import { UmdDocenteListItem } from '../../data/umd.types';

@Component({
  selector: 'app-umd-docentes-list',
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
  templateUrl: './umd-docentes-list.component.html',
  styleUrl: './umd-docentes-list.component.scss',
})
export class UmdDocentesListComponent implements AfterViewInit {
  private api = inject(UmdService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // filtros
  anioCtrl = new FormControl<number>(2025, { nonNullable: true });
  qCtrl = new FormControl<string>('', { nonNullable: true });

  // ✅ filtro por unidad (por NOMBRE, no por ID)
  unidadNombreCtrl = new FormControl<string>('', { nonNullable: true });

  // paginación (UI 1-based)
  page = signal(1);
  perPage = signal(20);

  total = signal(0);
  lastPage = signal(1);

  loading = signal(false);
  error = signal<string | null>(null);

  rows = signal<UmdDocenteListItem[]>([]);

  displayedColumns = ['id', 'nombre', 'rut', 'unidad', 'acciones'];

  // ✅ paginación 1..5 (sliding window)
  pages = computed<number[]>(() => {
    const last = this.lastPage();
    const current = this.page();
    const window = 5;

    if (last <= window) {
      return Array.from({ length: last }, (_, i) => i + 1);
    }

    let start = Math.max(1, current - 2);
    let end = start + window - 1;

    if (end > last) {
      end = last;
      start = end - window + 1;
    }

    return Array.from({ length: window }, (_, i) => start + i);
  });

  ngAfterViewInit(): void {
    // Año: cambio inmediato (sin debounce)
    this.anioCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.cargar();
      });

    // ✅ Unidad por nombre: debounce + trim para evitar llamados inútiles
    this.unidadNombreCtrl.valueChanges
      .pipe(
        map((v) => (v ?? '').trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((v) => {
        // normaliza el control (sin loops)
        if (v !== this.unidadNombreCtrl.value) {
          this.unidadNombreCtrl.setValue(v, { emitEvent: false });
        }
        this.page.set(1);
        this.cargar();
      });

    // Buscar: debounce + trim
    this.qCtrl.valueChanges
      .pipe(
        map((v) => (v ?? '').trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((v) => {
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

    const anio = this.anioCtrl.value;

    const q = this.qCtrl.value.trim() || undefined;
    const unidad = this.unidadNombreCtrl.value.trim() || undefined;

    this.api
      .getDocentes({
        anio,
        q,
        unidad, // ✅ backend espera "unidad" texto
        page: this.page(),
        per_page: this.perPage(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.rows.set(Array.isArray(res?.data) ? res.data : []);
          const meta = res?.meta;

          this.total.set(Number(meta?.total ?? this.rows().length ?? 0));
          this.lastPage.set(Number(meta?.last_page ?? 1));

          const last = this.lastPage();
          if (this.page() > last) this.page.set(last);

          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.rows.set([]);
          this.total.set(0);
          this.lastPage.set(1);
          this.error.set(err?.error?.message ?? err?.message ?? 'Error cargando docentes');
          this.loading.set(false);
        },
      });
  }

  volver(): void {
    this.router.navigate(['/umd/dashboard'], { queryParamsHandling: 'merge' });
  }

  // ====== paginación custom ======
  goToPage(p: number): void {
    if (!p || p < 1 || p > this.lastPage()) return;
    if (p === this.page()) return;
    this.page.set(p);
    this.cargar();
  }

  prevPage(): void {
    if (this.page() <= 1) return;
    this.page.set(this.page() - 1);
    this.cargar();
  }

  nextPage(): void {
    if (this.page() >= this.lastPage()) return;
    this.page.set(this.page() + 1);
    this.cargar();
  }

  // ====== tabla helpers ======
  getId(r: any): string {
    const id = r?.id_usuario ?? r?.id ?? '';
    return String(id || '—');
  }

  getNombre(r: any): string {
    return String(r?.nombre ?? r?.nombre_completo ?? '—');
  }

  getRut(r: any): string {
    return String(r?.rut ?? '—');
  }

  getUnidad(r: any): string {
    const n = String(r?.unidad_nombre ?? '').trim();
    if (n) return n;

    // fallback defensivo
    return String(r?.unidad ?? r?.id_unidad ?? '—');
  }

  abrirFicha(r: any): void {
    const id = Number(r?.id_usuario ?? r?.id ?? 0);
    if (!id || Number.isNaN(id)) return;

    this.router.navigate(['/umd/docentes', id], {
      queryParams: { anio: this.anioCtrl.value },
      queryParamsHandling: 'merge',
    });
  }
}
