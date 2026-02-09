import {
  AfterViewInit,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { UmdService } from '../../data/umd.service';
import { UmdFichaResponse, UmdFichaDocente } from '../../data/umd.types';

type TabKey = 'personal' | 'academico' | 'actividad';

@Component({
  selector: 'app-umd-docente-ficha',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './umd-docente-ficha.component.html',
  styleUrl: './umd-docente-ficha.component.scss',
})
export class UmdDocenteFichaComponent implements AfterViewInit {
  private api = inject(UmdService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  id = signal<number | null>(null);

  anioCtrl = new FormControl<number>(
    Number(this.route.snapshot.queryParamMap.get('anio') ?? 2025),
    { nonNullable: true }
  );

  loading = signal(false);
  error = signal<string | null>(null);

  response = signal<UmdFichaResponse<UmdFichaDocente> | null>(null);

  data = computed(() => this.response()?.data ?? null);
  meta = computed(() => this.response()?.meta ?? null);

  tab = signal<TabKey>('personal');

  ngAfterViewInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pm) => {
        // ✅ FIX: id viene string
        const raw = pm.get('id_usuario') ?? pm.get('id');
        const id = Number(raw ?? 0);

        if (!id || Number.isNaN(id)) {
          this.error.set('Docente inválido (no se recibió un id válido).');
          this.response.set(null);
          return;
        }

        this.id.set(id);
        this.cargar();
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((qpm) => {
        const anio = Number(qpm.get('anio') ?? 2025);
        if (Number.isFinite(anio) && anio !== this.anioCtrl.value) {
          this.anioCtrl.setValue(anio, { emitEvent: false });
          this.cargar();
        }
      });

    this.anioCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());
  }

  volver(): void {
    this.router.navigate(['/umd/docentes'], {
      queryParams: { anio: this.anioCtrl.value },
      queryParamsHandling: 'merge',
    });
  }

  setTab(t: TabKey): void {
    this.tab.set(t);
  }

  cargar(): void {
    const id = this.id();
    if (!id) return;

    this.loading.set(true);
    this.error.set(null);

    this.api
      .getDocenteById(id, this.anioCtrl.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.response.set(r ?? null);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.response.set(null);
          this.error.set(err?.error?.message ?? err?.message ?? 'Error cargando ficha docente');
          this.loading.set(false);
        },
      });
  }

  // ===== helpers UI =====
  nombreCompleto(): string {
    const i: any = this.data()?.identificacion;
    const full = [i?.nombres, i?.paterno, i?.materno].filter(Boolean).join(' ').trim();
    return full || `Usuario ${i?.id_usuario ?? this.id() ?? '—'}`;
  }

  rut(): string {
    const i: any = this.data()?.identificacion;
    return String(i?.rut ?? '—');
  }

  unidadNombre(): string {
    return String(this.data()?.adscripcion?.unidad?.nombre ?? '—');
  }

  programaNombre(): string {
    return String(this.data()?.adscripcion?.programa?.nombre ?? '—');
  }

  programaCodigo(): string {
    return String(this.data()?.adscripcion?.programa?.codigo ?? '—');
  }

  disponibleFlag(x: any): string {
    const ok = !!x?.disponible;
    return ok ? 'Disponible' : 'Pendiente';
  }

  fuenteLabel(x: any): string {
    return String(x?.fuente ?? this.meta()?.fuente ?? '—');
  }
}
