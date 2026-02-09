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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { OameAsistenciaService } from '../../services/oame-asistencia.service';
import { ProgramaDetallePayload } from '../../models/asistencia.models';
import { A11yModule } from "@angular/cdk/a11y";

@Component({
  selector: 'app-oame-asistencia-programa-detalle',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTableModule,
    MatPaginatorModule,
    A11yModule
],
  templateUrl: './oame-asistencia-programa-detalle.component.html',
  styleUrl: './oame-asistencia-programa-detalle.component.scss',
})
export class OameAsistenciaProgramaDetalleComponent implements AfterViewInit {
  private api = inject(OameAsistenciaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // ✅ params (reactivos y correctos)
  idPrograma = signal<number | null>(null);
  idUnidad = signal<number | null>(null);

  semestreCtrl = new FormControl<number>(
    Number(this.route.snapshot.queryParamMap.get('semestre') ?? 20252),
    { nonNullable: true }
  );

  // ✅ paginación (UI 0-based / API 1-based)
  pageIndex = signal(0);

  // ✅ FIJO: 50 por página
  pageSize = signal(50);

  total = signal(0);     // total estudiantes (para UI)
  lastPage = signal(1);  // total páginas server-side

  loading = signal(false);
  error = signal<string | null>(null);

  // ⬇️ response completo para leer meta.pagination
  response = signal<any | null>(null);
  payload = computed<ProgramaDetallePayload | null>(() => this.response()?.data ?? null);

  programa = computed(() => this.payload()?.programa ?? null);
  totales = computed(() => this.payload()?.totales ?? null);
  estudiantes = computed<any[]>(() => this.payload()?.estudiantes ?? []);

  // ✅ PÁGINAS consecutivas 1..N (server-side)
  pages = computed<number[]>(() => {
    const last = this.lastPage();
    return Array.from({ length: Math.max(1, last) }, (_, i) => i + 1);
  });

  // =========================
  // ✅ UMBRALES OFICIALES
  //   Rojo: 0-50
  //   Amarillo: 51-80
  //   Verde: 81-100
  // =========================
  readonly MAX_ROJO = 50;
  readonly MAX_AMARILLO = 80;

  displayedColumns = ['nombre', 'porcentaje', 'clases', 'asistencias'];

  ngAfterViewInit(): void {
    // ✅ Lee bien el :id del path y los queryParams
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pm) => {
        const id = Number(pm.get('id')); // 👈 tu ruta usa :id
        if (!id || Number.isNaN(id)) {
          this.error.set('Programa inválido (no se recibió un id_programa válido).');
          this.response.set(null);
          return;
        }
        this.idPrograma.set(id);
        this.pageIndex.set(0); // si cambia el programa, vuelve a pag 1
        this.cargar();
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((qpm) => {
        const idU = Number(qpm.get('id_unidad') ?? 0);
        this.idUnidad.set(idU || null);

        const sem = Number(qpm.get('semestre') ?? 20252);
        if (Number.isFinite(sem) && sem !== this.semestreCtrl.value) {
          this.semestreCtrl.setValue(sem, { emitEvent: false }); // evita doble load
          this.pageIndex.set(0);
          this.cargar();
        }
      });

    // cambio de semestre => recarga (y vuelve a página 1)
    this.semestreCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        this.cargar();
      });
  }

  cargar(): void {
    const idPrograma = this.idPrograma();
    if (!idPrograma) return;

    const semestre = this.semestreCtrl.value;
    const idUnidad = this.idUnidad() ?? undefined;

    // ✅ FIJO 50 por página (aunque alguien lo cambie por error)
    const perPage = 50;
    if (this.pageSize() !== 50) this.pageSize.set(50);

    const page = this.pageIndex() + 1; // API 1-based

    this.loading.set(true);
    this.error.set(null);

    this.api
      .programaDetalle(idPrograma, semestre, idUnidad, page, perPage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.response.set(res ?? null);

          // ✅ meta.pagination (si viene)
          const pag = res?.meta?.['pagination'];
          if (pag) {
            this.total.set(Number(pag.total ?? 0));
            this.lastPage.set(Number(pag.last_page ?? 1));
          } else {
            // fallback: si no viene meta.pagination, al menos no explota
            this.total.set(this.estudiantes().length);
            this.lastPage.set(1);
          }

          // ✅ si quedaste fuera de rango (por cambios de filtros), te baja
          const last = this.lastPage();
          const current = this.pageIndex() + 1;
          if (current > last) {
            this.pageIndex.set(Math.max(0, last - 1));
          }

          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.response.set(null);
          this.total.set(0);
          this.lastPage.set(1);

          this.error.set(
            err?.error?.message ?? err?.message ?? 'Error cargando detalle de programa'
          );
          this.loading.set(false);
        },
      });
  }

  // ✅ Compat (ya no hay mat-paginator, pero no lo elimino por si lo llamaban)
  onPageChange(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);

    // 🔒 fuerza 50 siempre
    if (ev.pageSize !== 50) {
      this.pageSize.set(50);
    } else {
      this.pageSize.set(ev.pageSize);
    }

    this.cargar();
  }

  // ==========================================================
  // ✅ NUEVO: paginación numérica consecutiva (server-side)
  // ==========================================================
  goToPage(page: number): void {
    const last = this.lastPage();
    if (!page || page < 1 || page > last) return;

    const idx = page - 1; // UI 0-based
    if (idx === this.pageIndex()) return;

    this.pageIndex.set(idx);
    this.cargar();
  }

  prevPage(): void {
    if (this.pageIndex() <= 0) return;
    this.pageIndex.set(this.pageIndex() - 1);
    this.cargar();
  }

  nextPage(): void {
    if (this.pageIndex() + 1 >= this.lastPage()) return;
    this.pageIndex.set(this.pageIndex() + 1);
    this.cargar();
  }

  volver(): void {
    const idU = this.idUnidad();
    if (!idU) {
      this.router.navigate(['/oame/dashboard'], { queryParamsHandling: 'merge' });
      return;
    }

    this.router.navigate(['/oame/asistencia/unidades', idU], {
      queryParamsHandling: 'merge',
    });
  }

  // ✅ nombre + rut (compat con distintos payloads)
  nombrePersona(row: any): string {
    const n1 = String(row?.nombre_alumno ?? '').trim();
    if (n1) return n1;

    const nombres = String(row?.nombres_usuario ?? '').trim();
    const paterno = String(row?.paterno_usuario ?? '').trim();
    const materno = String(row?.materno_usuario ?? '').trim();
    const full = [nombres, paterno, materno].filter(Boolean).join(' ').trim();
    if (full) return full;

    const id = row?.id_usuario ?? '';
    return id ? `Usuario ${id}` : 'Usuario';
  }

  rutPersona(row: any): string | null {
    const rut = String(row?.rut ?? '').trim();
    if (rut) return rut;

    const id = row?.id_usuario;
    const dv = String(row?.digito_rut_usuario ?? '').trim();
    if (id && dv) return `${id}-${dv}`;

    return null;
  }

  // ✅ ESTE ES EL MÉTODO QUE PINTA LOS BADGES (umbrales oficiales)
  badgeClass(p: string | number | null | undefined): string {
    const n = this.toNum(p);
    if (n === null) return 'badge badge-muted';

    if (n <= this.MAX_ROJO) return 'badge badge-red';
    if (n <= this.MAX_AMARILLO) return 'badge badge-amber';
    return 'badge badge-green';
  }

  private toNum(p: string | number | null | undefined): number | null {
    if (p === null || p === undefined || p === '') return null;

    const raw = typeof p === 'number' ? String(p) : String(p);
    const cleaned = raw.replace(',', '.'); // "87,7" -> "87.7"
    const n = Number(cleaned);

    if (!Number.isFinite(n)) return null;

    // clamp defensivo 0..100
    return Math.max(0, Math.min(100, n));
  }

  verFicha(row: any): void {
    const idUsuario = Number(row?.id_usuario ?? 0);
    if (!idUsuario || Number.isNaN(idUsuario)) return;

    this.router.navigate(['/oame/asistencia/ficha-estudiante', idUsuario], {
      queryParams: {
        semestre: this.semestreCtrl.value,
        id_unidad: this.idUnidad(),
        id_programa: this.idPrograma(), // ✅ CLAVE
      },
      queryParamsHandling: 'merge',
    });
  }

  sinRegistrosSemestre(row: any): boolean {
    // porcentaje puede venir como '-', null, '' o número
    const p = row?.porcentaje_asistencia ?? row?.porcentaje ?? row?.asistencia_pct ?? null;
    const n = this.toNum(p);

    const clases = Number(row?.clases ?? 0);
    const asist = Number(row?.asistencias ?? 0);

    // Criterio: no hay clases registradas en el semestre
    // (si clases=0, asistencias=0 y porcentaje no es numérico)
    return clases === 0 && asist === 0 && n === null;
  }
}
