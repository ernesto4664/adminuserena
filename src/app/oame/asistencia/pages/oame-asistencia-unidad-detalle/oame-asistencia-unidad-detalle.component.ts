import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

import { OameAsistenciaService } from '../../services/oame-asistencia.service';

// =========================
// Types locales (manteniendo tu consistencia)
// =========================
type UnidadDTO = { id_unidad: number; des_unidad: string };

type TotalesDTO = {
  total_estudiantes: number;
  estudiantes_con_asistencia: number;
  total_clases: number;
  total_asistencias: number;
  porcentaje_asistencia: number | null;
};

type ProgramaDTO = {
  id_programa: number;
  cod_programa: string;
  nombre_programa: string;
  total_estudiantes: number;
  estudiantes_con_asistencia: number;
  total_clases: number;
  total_asistencias: number;
  porcentaje_asistencia: number | null;
};

type UnidadDetallePayload = {
  unidad: UnidadDTO;
  totales: TotalesDTO;
  programas: ProgramaDTO[];
};

@Component({
  selector: 'app-oame-asistencia-unidad-detalle',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DecimalPipe,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatPaginatorModule, // ✅ NUEVO
  ],
  templateUrl: './oame-asistencia-unidad-detalle.component.html',
  styleUrl: './oame-asistencia-unidad-detalle.component.scss',
})
export class OameAsistenciaUnidadDetalleComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(OameAsistenciaService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal<string | null>(null);

  semestre = signal<number>(20252);
  idUnidad = signal<number | null>(null);

  data = signal<UnidadDetallePayload | null>(null);

  displayedColumns: string[] = [
    'nombre_programa',
    'porcentaje_asistencia',
    'total_estudiantes',
    'total_clases',
    'total_asistencias',
  ];

  // ✅ datasource para paginar sin romper el payload
  programasDs = new MatTableDataSource<ProgramaDTO>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // ==========================================================
  // ✅ NUEVO: paginación numérica consecutiva
  // ==========================================================
  pageSize = signal(10);
  currentPage = signal(1);
  totalPages = signal(1);
  pages = signal<number[]>([]);

  // =========================
  // ✅ UMBRALES OFICIALES
  // =========================
  readonly MAX_ROJO = 50;
  readonly MAX_AMARILLO = 80;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const sem = Number(this.route.snapshot.queryParamMap.get('semestre') ?? 20252);

    if (!id || Number.isNaN(id)) {
      this.error.set('Unidad inválida (no se recibió un id_unidad válido).');
      this.loading.set(false);
      return;
    }

    this.idUnidad.set(id);
    this.semestre.set(Number.isNaN(sem) ? 20252 : sem);

    this.cargar();
  }

  ngAfterViewInit(): void {
    // ✅ conectar paginator real (oculto)
    this.programasDs.paginator = this.paginator;
    this.paginator.pageSize = this.pageSize();

    // ✅ sincronizar UI custom cuando cambie pageIndex
    this.paginator.page
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPagination(false));

    // ✅ estado inicial
    queueMicrotask(() => this.syncPagination(true));
  }

  cargar(): void {
    const id = this.idUnidad();
    if (!id) return;

    const sem = this.semestre();

    this.loading.set(true);
    this.error.set(null);

    this.api
      .detalleUnidad(id, sem)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp: any) => {
          const payload = (resp?.data ?? null) as UnidadDetallePayload | null;
          this.data.set(payload);

          // ✅ setear programas en datasource paginado
          this.programasDs.data = payload?.programas ?? [];

          this.loading.set(false);

          // ✅ al cargar data nueva, ir a página 1 y recalcular
          queueMicrotask(() => this.syncPagination(true));
        },
        error: (e) => {
          console.error(e);
          this.error.set('No fue posible cargar el detalle de la unidad.');
          this.data.set(null);
          this.programasDs.data = [];
          this.loading.set(false);

          queueMicrotask(() => this.syncPagination(true));
        },
      });
  }

  // ✅ ESTE ES EL MÉTODO QUE PINTA LOS BADGES
  badgeClass(p: number | string | null | undefined): string {
    const n = this.toNum(p);
    if (n === null) return 'badge badge-muted';

    if (n <= this.MAX_ROJO) return 'badge badge-red';
    if (n <= this.MAX_AMARILLO) return 'badge badge-amber';
    return 'badge badge-green';
  }

  private toNum(p: number | string | null | undefined): number | null {
    if (p === null || p === undefined || p === '') return null;

    const raw = typeof p === 'number' ? String(p) : String(p);
    const cleaned = raw.replace(',', '.');
    const n = Number(cleaned);

    if (!Number.isFinite(n)) return null;

    return Math.max(0, Math.min(100, n));
  }

  verPrograma(p: ProgramaDTO): void {
    this.router.navigate(['/oame/asistencia/programas', p.id_programa], {
      queryParams: {
        semestre: this.semestre(),
        id_unidad: this.idUnidad(),
      },
      queryParamsHandling: 'merge',
    });
  }

  // ==========================================================
  // ✅ NUEVO: lógica paginación numérica consecutiva
  // ==========================================================
  private syncPagination(resetToFirst: boolean): void {
    if (!this.paginator) return;

    const totalItems = this.programasDs.filteredData?.length ?? this.programasDs.data.length ?? 0;

    const size = this.pageSize();
    this.paginator.pageSize = size;

    const pages = Math.max(1, Math.ceil(totalItems / size));

    if (resetToFirst) {
      this.paginator.firstPage();
    } else {
      const maxIndex = Math.max(0, pages - 1);
      if (this.paginator.pageIndex > maxIndex) {
        this.paginator.pageIndex = maxIndex;
        this.paginator._changePageSize(size);
      }
    }

    this.totalPages.set(pages);
    this.currentPage.set((this.paginator.pageIndex ?? 0) + 1);
    this.pages.set(Array.from({ length: pages }, (_, i) => i + 1));
  }

  goToPage(page: number): void {
    const pages = this.totalPages();
    if (page < 1 || page > pages) return;

    const targetIndex = page - 1;
    if (this.paginator.pageIndex === targetIndex) return;

    this.paginator.pageIndex = targetIndex;
    this.paginator._changePageSize(this.paginator.pageSize);
    this.syncPagination(false);
  }

  prevPage(): void {
    if (this.currentPage() <= 1) return;
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages()) return;
    this.goToPage(this.currentPage() + 1);
  }
}
