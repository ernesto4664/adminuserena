import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  BarController,
  DoughnutController,
} from 'chart.js';

import { OameAsistenciaService } from '../../services/oame-asistencia.service';
import { UnidadAsistenciaRow } from '../../models/asistencia.models';

Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  BarController,
  DoughnutController
);

@Component({
  selector: 'app-oame-asistencia-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    DecimalPipe,

    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressBarModule,
  ],
  templateUrl: './oame-asistencia-dashboard.component.html',
  styleUrl: './oame-asistencia-dashboard.component.scss',
})
export class OameAsistenciaDashboardComponent implements AfterViewInit {
  private api = inject(OameAsistenciaService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  @ViewChild('barCanvas') barCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas') donutCanvas?: ElementRef<HTMLCanvasElement>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private barChart?: Chart;
  private donutChart?: Chart;

  private viewReady = signal(false);

  semestreCtrl = new FormControl<number>(20252, { nonNullable: true });
  qCtrl = new FormControl<string>('', { nonNullable: true });

  loading = signal(false);
  rows = signal<UnidadAsistenciaRow[]>([]);
  error = signal<string | null>(null);

  // ==========================================================
  // ✅ NUEVO: paginación numérica consecutiva (UI custom)
  //   - sin romper MatPaginator real
  // ==========================================================
  pageSize = signal(10);        // mismo default que tenías
  currentPage = signal(1);      // 1-based
  totalPages = signal(1);       // 1..N
  pages = signal<number[]>([]); // [1..N]

  // ==========================================================
  // ✅ EXCLUSIÓN: Unidades administrativas
  // ==========================================================
  private readonly UNIDADES_ADMINISTRATIVAS = new Set<string>([
    'ADMISIÓN Y MATRÍCULA',
  ]);

  private normalizeUnidadName(name: string | null | undefined): string {
    return (name ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .replace('ADMISION Y MATRICULA', 'ADMISIÓN Y MATRÍCULA');
  }

  rowsAcademicas = computed(() =>
    this.rows().filter((r) => {
      const key = this.normalizeUnidadName(r.des_unidad);
      return !this.UNIDADES_ADMINISTRATIVAS.has(key);
    })
  );

  displayedColumns: string[] = [
    'des_unidad',
    'porcentaje_asistencia',
    'total_estudiantes',
    'total_clases',
    'total_asistencias',
    'actions',
  ];

  dataSource = new MatTableDataSource<UnidadAsistenciaRow>([]);

  // =========================
  // ✅ UMBRALES OFICIALES
  // =========================
  readonly MAX_ROJO = 50;
  readonly MAX_AMARILLO = 80;

  // =========================
  // KPI (sobre rowsAcademicas)
  // =========================
  totalEstudiantes = computed(() =>
    this.rowsAcademicas().reduce((acc, r) => acc + (r.total_estudiantes ?? 0), 0)
  );

  totalClases = computed(() =>
    this.rowsAcademicas().reduce((acc, r) => acc + (r.total_clases ?? 0), 0)
  );

  totalAsistencias = computed(() =>
    this.rowsAcademicas().reduce((acc, r) => acc + (r.total_asistencias ?? 0), 0)
  );

  porcentajeGlobal = computed(() => {
    const clases = this.totalClases();
    const asis = this.totalAsistencias();
    if (!clases) return null;
    return +((asis / clases) * 100).toFixed(2);
  });

  unidadesEnRojo = computed(() =>
    this.rowsAcademicas().filter((r) => {
      const n = this.toNum(r.porcentaje_asistencia);
      return n !== null && n <= this.MAX_ROJO;
    }).length
  );

  unidadesConDatos = computed(() =>
    this.rowsAcademicas().filter((r) => (r.total_clases ?? 0) > 0).length
  );

  private _rowsFx = effect(() => {
    const dataAcad = this.rowsAcademicas();
    this.dataSource.data = dataAcad;

    // ✅ recalcular paginación al cambiar data
    queueMicrotask(() => this.syncPagination(true));

    if (!this.viewReady()) return;
    queueMicrotask(() => this.renderCharts());
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.barChart?.destroy();
      this.donutChart?.destroy();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // ✅ fijar pageSize inicial sin tocar tu paginator options
    this.paginator.pageSize = this.pageSize();

    // ✅ sincronizar UI custom cuando el paginator cambie (por código o por eventos)
    this.paginator.page
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPagination(false));

    this.dataSource.filterPredicate = (data, filter) =>
      (data.des_unidad ?? '').toLowerCase().includes(filter.trim().toLowerCase());

    this.viewReady.set(true);

    this.cargar();

    this.semestreCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());

    this.qCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((v) => {
        this.dataSource.filter = v ?? '';

        // ✅ al filtrar, ir a página 1 (estándar UX)
        queueMicrotask(() => this.syncPagination(true));
      });
  }

  cargar(): void {
    const semestre = this.semestreCtrl.value;
    const q = this.qCtrl.value ?? '';

    this.loading.set(true);
    this.error.set(null);

    this.api.listarUnidades(semestre, q).subscribe({
      next: (res) => {
        this.rows.set(res?.data ?? []);
        this.loading.set(false);

        // ✅ al cargar, ir a página 1
        queueMicrotask(() => this.syncPagination(true));
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error cargando datos');
        this.rows.set([]);
        this.loading.set(false);

        queueMicrotask(() => this.syncPagination(true));
      },
    });
  }

  irADetalleUnidad(row: UnidadAsistenciaRow) {
    this.router.navigate(['/oame/asistencia/unidades', row.id_unidad], {
      queryParams: { semestre: this.semestreCtrl.value },
    });
  }

  // ✅ ESTE ES EL MÉTODO REAL QUE PINTA
  badgeClass(p: string | null): string {
    const n = this.toNum(p);
    if (n === null) return 'badge badge-muted';
    if (n <= this.MAX_ROJO) return 'badge badge-red';
    if (n <= this.MAX_AMARILLO) return 'badge badge-amber';
    return 'badge badge-green';
  }

  private toNum(p: string | null): number | null {
    if (p === null || p === undefined || p === '') return null;

    const cleaned = String(p).replace(',', '.');
    const n = Number(cleaned);

    if (!Number.isFinite(n)) return null;

    const clamped = Math.max(0, Math.min(100, n));
    return clamped;
  }

  // ==========================================================
  // ✅ NUEVO: lógica paginación numérica consecutiva
  // ==========================================================
  private syncPagination(resetToFirst: boolean): void {
    if (!this.paginator) return;

    // MatTableDataSource usa filteredData para el largo real
    const totalItems = this.dataSource.filteredData?.length ?? 0;

    const size = this.pageSize();
    this.paginator.pageSize = size;

    const pages = Math.max(1, Math.ceil(totalItems / size));

    if (resetToFirst) {
      this.paginator.firstPage();
    } else {
      // clamp defensivo si el filtro reduce el total y quedaste fuera
      const maxIndex = Math.max(0, pages - 1);
      if (this.paginator.pageIndex > maxIndex) {
        this.paginator.pageIndex = maxIndex;
        // forzar render
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
    // dispara la actualización interna del datasource
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

  // =========================
  // Charts (sobre rowsAcademicas)
  // =========================
  private renderCharts() {
    const data = this.rowsAcademicas();

    const barEl = this.barCanvas?.nativeElement ?? null;
    const donutEl = this.donutCanvas?.nativeElement ?? null;

    if (!barEl && !donutEl) return;

    const top = [...data]
      .map((r) => ({ ...r, p: this.toNum(r.porcentaje_asistencia) }))
      .filter((r) => r.p !== null)
      .sort((a, b) => b.p! - a.p!)
      .slice(0, 10);

    if (barEl) {
      this.barChart?.destroy();
      this.barChart = new Chart(barEl, {
        type: 'bar',
        data: {
          labels: top.map((r) => r.des_unidad),
          datasets: [
            {
              label: '% Asistencia (Top 10)',
              data: top.map((r) => r.p!),
              borderWidth: 0,
              borderRadius: 8,
              backgroundColor: 'rgba(33, 150, 243, 0.55)',
              hoverBackgroundColor: 'rgba(33, 150, 243, 0.75)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 },
            },
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { callback: (v) => `${v}%` },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.parsed.y?.toFixed?.(2) ?? ctx.parsed.y}%`,
              },
            },
          },
        },
      });
    }

    const counts = { verde: 0, amarillo: 0, rojo: 0, sin: 0 };

    data.forEach((r) => {
      const n = this.toNum(r.porcentaje_asistencia);
      const clases = r.total_clases ?? 0;

      if (n === null || clases === 0) counts.sin++;
      else if (n <= this.MAX_ROJO) counts.rojo++;
      else if (n <= this.MAX_AMARILLO) counts.amarillo++;
      else counts.verde++;
    });

    if (donutEl) {
      this.donutChart?.destroy();
      this.donutChart = new Chart(donutEl, {
        type: 'doughnut',
        data: {
          labels: ['Verde (81-100)', 'Amarillo (51-80)', 'Rojo (0-50)', 'Sin datos'],
          datasets: [
            {
              data: [counts.verde, counts.amarillo, counts.rojo, counts.sin],
              borderWidth: 0,
              backgroundColor: [
                'rgba(46, 204, 113, 0.75)',
                'rgba(241, 196, 15, 0.78)',
                'rgba(231, 76, 60, 0.78)',
                'rgba(189, 195, 199, 0.75)',
              ],
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const label = ctx.label ?? '';
                  const value = Number(ctx.parsed ?? 0);
                  const total =
                    (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0) || 1;
                  const pct = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }
  }
}
