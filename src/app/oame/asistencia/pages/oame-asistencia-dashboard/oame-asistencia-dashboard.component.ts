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

// ✅ Registrar controllers + elements (evita "bar not registered")
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

  // ✅ canvases via ViewChild (no getElementById)
  @ViewChild('barCanvas') barCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas') donutCanvas?: ElementRef<HTMLCanvasElement>;

  // Material table
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Charts instances
  private barChart?: Chart;
  private donutChart?: Chart;

  // Gating: no render chart hasta que el view exista
  private viewReady = signal(false);

  // Form controls
  semestreCtrl = new FormControl<number>(20252, { nonNullable: true });
  qCtrl = new FormControl<string>('', { nonNullable: true });

  // State
  loading = signal(false);
  rows = signal<UnidadAsistenciaRow[]>([]);
  error = signal<string | null>(null);

  // ==========================================================
  // ✅ EXCLUSIÓN: Unidades administrativas (no deben mezclarse)
  //   - agrega aquí si aparecen otras (ej: "REGISTRO CURRICULAR")
  // ==========================================================
  private readonly UNIDADES_ADMINISTRATIVAS = new Set<string>([
    'ADMISIÓN Y MATRÍCULA',
    // 'ADMISION Y MATRICULA', // por si viene sin tilde
  ]);

  private normalizeUnidadName(name: string | null | undefined): string {
    return (name ?? '')
      .trim()
      .toUpperCase()
      // normaliza espacios múltiples
      .replace(/\s+/g, ' ')
      // opcional: normaliza algunas tildes comunes (solo si te llega con variantes)
      .replace('ADMISION Y MATRICULA', 'ADMISIÓN Y MATRÍCULA');
  }

  /**
   * ✅ Solo unidades académicas para KPIs / charts / tabla
   * (rows() queda intacto por si luego quieres mostrar “administrativas” en otro lugar)
   */
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
  // KPI (✅ ahora sobre rowsAcademicas)
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

  UMBRAL_ROJO = 80;
  UMBRAL_VERDE = 90;

  unidadesEnRojo = computed(() =>
    this.rowsAcademicas().filter((r) => {
      const n = this.toNum(r.porcentaje_asistencia);
      return n !== null && n < this.UMBRAL_ROJO;
    }).length
  );

  unidadesConDatos = computed(() =>
    this.rowsAcademicas().filter((r) => (r.total_clases ?? 0) > 0).length
  );

  /**
   * ✅ FIX:
   * - Actualiza tabla con rowsAcademicas
   * - Render charts SOLO si viewReady() es true
   * - Protege contra “canvas already in use”
   */
  private _rowsFx = effect(() => {
    // ✅ solo académicas a la tabla
    const dataAcad = this.rowsAcademicas();
    this.dataSource.data = dataAcad;

    if (!this.viewReady()) return;

    // 🔑 re-render seguro
    queueMicrotask(() => this.renderCharts());
  });

  constructor() {
    // ✅ destruir charts al salir (evita "canvas already in use" al volver)
    this.destroyRef.onDestroy(() => {
      this.barChart?.destroy();
      this.donutChart?.destroy();
    });
  }

  ngAfterViewInit(): void {
    // Table bindings
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // filtro front (tabla académica ya filtrada, esto solo busca dentro)
    this.dataSource.filterPredicate = (data, filter) =>
      (data.des_unidad ?? '').toLowerCase().includes(filter.trim().toLowerCase());

    // ✅ view listo para charts
    this.viewReady.set(true);

    // carga inicial
    this.cargar();

    // semestre: recarga directo
    this.semestreCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());

    // ✅ búsqueda: SOLO filtra tabla localmente (no pega al backend por tecla)
    this.qCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((v) => {
        this.dataSource.filter = v ?? '';
      });
  }

  cargar(): void {
    const semestre = this.semestreCtrl.value;

    // 🔑 server-side search solo al “Actualizar” / cambio semestre
    const q = this.qCtrl.value ?? '';

    this.loading.set(true);
    this.error.set(null);

    this.api.listarUnidades(semestre, q).subscribe({
      next: (res) => {
        this.rows.set(res?.data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error cargando datos');
        this.rows.set([]);
        this.loading.set(false);
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
    if (n < this.UMBRAL_ROJO) return 'badge badge-red';
    if (n < this.UMBRAL_VERDE) return 'badge badge-amber';
    return 'badge badge-green';
  }

  private toNum(p: string | null): number | null {
    if (p === null || p === undefined || p === '') return null;

    // ✅ protege si viene "87,7" con coma
    const cleaned = String(p).replace(',', '.');
    const n = Number(cleaned);

    return Number.isFinite(n) ? n : null;
  }

  // =========================
  // Charts (✅ trabajan sobre rowsAcademicas)
  // =========================
  private renderCharts() {
    const data = this.rowsAcademicas();

    const barEl = this.barCanvas?.nativeElement ?? null;
    const donutEl = this.donutCanvas?.nativeElement ?? null;

    if (!barEl && !donutEl) return;

    // ---- BAR: Top 10 por %
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
              ticks: {
                autoSkip: true,
                maxRotation: 0,
                minRotation: 0,
              },
            },
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (v) => `${v}%`,
              },
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

    // ---- DONUT: Distribución por riesgo
    const counts = { verde: 0, amarillo: 0, rojo: 0, sin: 0 };

    data.forEach((r) => {
      const n = this.toNum(r.porcentaje_asistencia);
      const clases = r.total_clases ?? 0;

      if (n === null || clases === 0) counts.sin++;
      else if (n < this.UMBRAL_ROJO) counts.rojo++;
      else if (n < this.UMBRAL_VERDE) counts.amarillo++;
      else counts.verde++;
    });

    if (donutEl) {
      this.donutChart?.destroy();
      this.donutChart = new Chart(donutEl, {
        type: 'doughnut',
        data: {
          labels: ['Verde (>=90)', 'Amarillo (80-89.99)', 'Rojo (<80)', 'Sin datos'],
          datasets: [
            {
              data: [counts.verde, counts.amarillo, counts.rojo, counts.sin],
              borderWidth: 0,
              backgroundColor: [
                'rgba(46, 204, 113, 0.75)',  // verde
                'rgba(241, 196, 15, 0.78)',  // amarillo
                'rgba(231, 76, 60, 0.78)',   // rojo
                'rgba(189, 195, 199, 0.75)', // sin
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
