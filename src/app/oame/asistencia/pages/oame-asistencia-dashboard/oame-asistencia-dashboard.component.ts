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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs'; // ✅ NUEVO

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

type DashboardModuleCard = {
  key: string;
  title: string;
  description: string;
  icon: string;
  cta: string;
  route?: string;
  disabled?: boolean;
  badge?: string;
};

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
  private route = inject(ActivatedRoute);
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
  semestreSig = signal<number>(20252);
  loading = signal(false);
  rows = signal<UnidadAsistenciaRow[]>([]);
  error = signal<string | null>(null);

  // ✅ paginación numérica consecutiva
  pageSize = signal(10);
  currentPage = signal(1);
  totalPages = signal(1);
  pages = signal<number[]>([]);

  // ✅ NUEVO: controla request activo para no pisarte respuestas viejas
  private loadSub?: Subscription;

  // ✅ EXCLUSIÓN: Unidades administrativas
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

  // ✅ UMBRALES
  readonly MAX_ROJO = 50;
  readonly MAX_AMARILLO = 80;

  // =========================
  // ✅ NUEVO: módulos faltantes (UI)
  // =========================
  modules = computed<DashboardModuleCard[]>(() => {
    
      const sem = this.semestreSig();
    return [
      {
        key: 'riesgo',
        title: 'Riesgo académico',
        description: 'Consolidado por unidad/programa y acceso a estudiantes en riesgo.',
        icon: 'report',
        cta: 'Ver análisis',
        route: '/oame/riesgo',
        disabled: false,
        badge: '',
      },
      {
        key: 'alertas',
        title: 'Alertas',
        description: 'Alertas activas por unidad y seguimiento de casos priorizados.',
        icon: 'notifications',
        cta: 'Ver alertas',
        route: '/oame/alertas',
        disabled: false,
        badge: '',
      },
      {
        key: 'acompanamientos',
        title: 'Acompañamientos',
        description: 'Registro y estado de acompañamientos por unidad/programa.',
        icon: 'handshake',
        cta: 'Ver acompañamientos',
        route: '/oame/acompanamientos',
        disabled: false,
        badge: '',
      },
      {
        key: 'rendimiento',
        title: 'Rendimiento y parciales',
        description: 'Acceso al buscador de estudiantes y ficha (calificaciones/parciales).',
        icon: 'school',
        cta: 'Ir a buscador',
        route: '/oame/estudiantes',
        disabled: false,
        badge: `Sem ${sem}`,
      },
    ];
  });

  abrirModulo(m: DashboardModuleCard): void {
    if (m.disabled || !m.route) return;
    this.router.navigate([m.route], { queryParams: { semestre: this.semestreCtrl.value } });
  }

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

    queueMicrotask(() => this.syncPagination(true));

    if (!this.viewReady()) return;
    queueMicrotask(() => this.renderCharts());
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.loadSub?.unsubscribe(); // ✅ NUEVO
      this.barChart?.destroy();
      this.donutChart?.destroy();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.paginator.pageSize = this.pageSize();

    this.paginator.page
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPagination(false));

    this.dataSource.filterPredicate = (data, filter) =>
      (data.des_unidad ?? '').toLowerCase().includes((filter ?? '').trim().toLowerCase());

    this.viewReady.set(true);

    // ✅ 1) Al entrar: si viene ?semestre en URL, úsalo
    const semFromUrl = Number(this.route.snapshot.queryParamMap.get('semestre'));
    if (Number.isFinite(semFromUrl) && semFromUrl > 0) {
      this.semestreCtrl.setValue(semFromUrl, { emitEvent: false });
      this.semestreSig.set(semFromUrl);
    } else {
      // asegura consistencia (por si el form arranca con 20252)
      this.semestreSig.set(this.semestreCtrl.value);
    }

    // ✅ Cargar con el semestre ya sincronizado
    this.cargar();

    // ✅ 2) Cuando cambie semestre: actualiza URL + recarga
    this.semestreCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        const sem = (v ?? 20252);

        this.semestreSig.set(sem);

        // ✅ actualiza URL sin recargar (y sin perder otros params)
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { semestre: sem },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });

        this.cargar();
      });

    this.qCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((v) => {
        this.dataSource.filter = v ?? '';
        queueMicrotask(() => this.syncPagination(true));
      });
  }

  cargar(): void {
    const semestre = this.semestreCtrl.value;
    const q = this.qCtrl.value ?? '';

    this.loading.set(true);
    this.error.set(null);

    // ✅ NUEVO: cancela petición anterior para evitar race
    this.loadSub?.unsubscribe();

    this.loadSub = this.api.listarUnidades(semestre, q).subscribe({
      next: (res) => {
        this.rows.set(res?.data ?? []);
        this.loading.set(false);
        queueMicrotask(() => this.syncPagination(true));
      },
      error: (err) => {
        // ✅ NUEVO: error más robusto (sin cambiar tu UI)
        const msg =
          err?.error?.message ??
          err?.message ??
          'Error cargando datos';

        this.error.set(msg);
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

  private syncPagination(resetToFirst: boolean): void {
    if (!this.paginator) return;

    const totalItems = this.dataSource.filteredData?.length ?? 0;

    const size = this.pageSize();
    this.paginator.pageSize = size;

    const pages = Math.max(1, Math.ceil(totalItems / size));

    if (resetToFirst) {
      this.paginator.firstPage();
    } else {
      const maxIndex = Math.max(0, pages - 1);
      if (this.paginator.pageIndex > maxIndex) {
        this.paginator.pageIndex = maxIndex;
        this.paginator._changePageSize(size); // ✅ NO TOCO tu lógica (se queda)
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
    this.paginator._changePageSize(this.paginator.pageSize); // ✅ NO TOCO tu lógica (se queda)
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

  private renderCharts() {
    const data = this.rowsAcademicas();

    const barEl = this.barCanvas?.nativeElement ?? null;
    const donutEl = this.donutCanvas?.nativeElement ?? null;

    if (!barEl && !donutEl) return;

    // ✅ NUEVO: si no hay data, limpia charts y evita basura/errores
    if (!data || data.length === 0) {
      this.barChart?.destroy();
      this.donutChart?.destroy();
      this.barChart = undefined;
      this.donutChart = undefined;
      return;
    }

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
          labels: top.map((r) => r.des_unidad ?? '—'), // ✅ defensivo
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
