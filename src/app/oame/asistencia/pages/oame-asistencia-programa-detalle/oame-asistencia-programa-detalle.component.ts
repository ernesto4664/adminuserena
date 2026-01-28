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
  pageSize = signal(50);
  total = signal(0);     // total estudiantes (para paginator)
  lastPage = signal(1);  // opcional

  loading = signal(false);
  error = signal<string | null>(null);

  // ⬇️ OJO: aquí guardamos el response completo para leer meta.pagination
  response = signal<any | null>(null);
  payload = computed<ProgramaDetallePayload | null>(() => this.response()?.data ?? null);

  programa = computed(() => this.payload()?.programa ?? null);
  totales = computed(() => this.payload()?.totales ?? null);
  estudiantes = computed<any[]>(() => this.payload()?.estudiantes ?? []);

  UMBRAL_ROJO = 80;
  UMBRAL_VERDE = 90;

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

    const page = this.pageIndex() + 1; // API 1-based
    const perPage = this.pageSize();

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

  onPageChange(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
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
    // viejo (si existiera)
    const n1 = String(row?.nombre_alumno ?? '').trim();
    if (n1) return n1;

    // maestro real (capturas)
    const nombres = String(row?.nombres_usuario ?? '').trim();
    const paterno = String(row?.paterno_usuario ?? '').trim();
    const materno = String(row?.materno_usuario ?? '').trim();
    const full = [nombres, paterno, materno].filter(Boolean).join(' ').trim();
    if (full) return full;

    // fallback
    const id = row?.id_usuario ?? '';
    return id ? `Usuario ${id}` : 'Usuario';
  }

  rutPersona(row: any): string | null {
    // viejo (si existiera)
    const rut = String(row?.rut ?? '').trim();
    if (rut) return rut;

    // maestro real: id_usuario + digito_rut_usuario
    const id = row?.id_usuario;
    const dv = String(row?.digito_rut_usuario ?? '').trim();
    if (id && dv) return `${id}-${dv}`;

    return null;
  }

  badgeClass(p: string | number | null): string {
    const n = this.toNum(p);
    if (n === null) return 'badge badge-muted';
    if (n < this.UMBRAL_ROJO) return 'badge badge-red';
    if (n < this.UMBRAL_VERDE) return 'badge badge-amber';
    return 'badge badge-green';
  }

  private toNum(p: string | number | null): number | null {
    if (p === null || p === undefined || p === '') return null;
    const n = Number(String(p).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
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

}
