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

import {
  OameFichaEstudianteService,
  FichaEstudianteResponse,
  FichaIncludeKey,
} from '../../services/oame-fichaestudiante.service';

type TabKey = 'personal' | 'academico' | 'seguimientos';

@Component({
  selector: 'app-oame-fichaestudiante',
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
  templateUrl: './oame-fichaestudiante.component.html',
  styleUrl: './oame-fichaestudiante.component.scss',
})
export class OameFichaEstudianteComponent implements AfterViewInit {
  private svc = inject(OameFichaEstudianteService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // ============ params ============
  idUsuario = signal<number | null>(null);

  semestreCtrl = new FormControl<number>(
    Number(this.route.snapshot.queryParamMap.get('semestre') ?? 20252),
    { nonNullable: true }
  );

  // si vienes desde programa/unidad, puedes mantenerlos como contexto para el "volver"
  idUnidad = signal<number | null>(null);
  idPrograma = signal<number | null>(null);

  // ============ UI state ============
  loading = signal(false);
  error = signal<string | null>(null);

  // respuesta completa
  response = signal<FichaEstudianteResponse | null>(null);

  // ============ computed data ============
  data = computed(() => this.response()?.data ?? null);
  meta = computed(() => this.response()?.meta ?? null);

  personal = computed(() => this.data()?.personal ?? null);
  academico = computed(() => this.data()?.academico ?? null);
  progreso = computed(() => this.data()?.progreso ?? null);

  calificaciones = computed<any[]>(() => this.data()?.calificaciones ?? []);
  parciales = computed<any[]>(() => this.data()?.parciales ?? []);
  seguimientos = computed<any[]>(() => this.data()?.seguimientos ?? []);
  documentos = computed<any[]>(() => this.data()?.documentos ?? []);
  indicadores = computed<any[]>(() => this.data()?.indicadores ?? []);

  // pestañas (según diseño que pasaste)
  tab = signal<TabKey>('personal');

  // include actual (lo puedes cambiar según pestaña)
  include = signal<FichaIncludeKey[]>(['calificaciones']); // default

  // transición CSV -> BD (por ahora puedes dejar 'csv' o undefined)
  source = signal<'csv' | 'db' | undefined>(undefined);

  ngAfterViewInit(): void {
    // lee id_usuario de ruta: /oame/asistencia/ficha-estudiante/:id_usuario  (ejemplo)
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pm) => {
        const id = Number(pm.get('id_usuario') ?? pm.get('id')); // soporta ambos
        if (!id || Number.isNaN(id)) {
          this.error.set('Estudiante inválido (no se recibió un id_usuario válido).');
          this.response.set(null);
          return;
        }
        this.idUsuario.set(id);
        this.cargar(); // primera carga
      });

    // query params: semestre, id_unidad, id_programa (para volver)
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((qpm) => {
        const sem = Number(qpm.get('semestre') ?? 20252);
        if (Number.isFinite(sem) && sem !== this.semestreCtrl.value) {
          this.semestreCtrl.setValue(sem, { emitEvent: false });
        }

        const idU = Number(qpm.get('id_unidad') ?? 0);
        this.idUnidad.set(idU || null);

        const idP = Number(qpm.get('id_programa') ?? 0);
        this.idPrograma.set(idP || null);
      });

    // cambio semestre => recarga
    this.semestreCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());
  }

  // ================== navegación ==================

  volver(): void {
    // si vienes desde detalle programa, vuelve allí
    const idP = this.idPrograma();
    const idU = this.idUnidad();

    if (idP) {
      this.router.navigate(['/oame/asistencia/programas', idP], {
        queryParamsHandling: 'merge',
      });
      return;
    }

    if (idU) {
      this.router.navigate(['/oame/asistencia/unidades', idU], {
        queryParamsHandling: 'merge',
      });
      return;
    }

    this.router.navigate(['/oame/dashboard'], { queryParamsHandling: 'merge' });
  }

  // ================== tabs ==================

  setTab(t: TabKey): void {
    this.tab.set(t);

    // según pestaña, pide includes específicos (optimiza payload)
    if (t === 'personal') {
      this.include.set(['documentos']); // o vacío si aún no hay backend para docs
    } else if (t === 'academico') {
      this.include.set(['calificaciones', 'parciales']);
    } else {
      // seguimientos y actividades
      this.include.set(['seguimientos', 'indicadores']);
    }

    this.cargar();
  }

  // ================== data load ==================

  cargar(): void {
    const id = this.idUsuario();
    if (!id) return;

    const semestre = this.semestreCtrl.value;

    this.loading.set(true);
    this.error.set(null);

    this.svc
      .ficha(id, {
        semestre,
        include: this.include(),
        // mientras estás probando:
        no_cache: false,
        debug: false,
        // deja que backend decida; o fuerza: this.source()
        source: this.source(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.response.set(res ?? null);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.response.set(null);
          this.error.set(err?.error?.message ?? err?.message ?? 'Error cargando ficha');
          this.loading.set(false);
        },
      });
  }

  // ================== helpers UI ==================

  /**
   * Barra de progreso (la 3ra pestaña) debe depender de:
   * - progreso.total_semestres
   * - progreso.semestre_actual
   *
   * OJO: tu backend hoy trae semestre_actual desde CSV como 20021 etc.
   * Aquí solo convertimos a % por seguridad.
   */
  progresoPercent(): number | null {
    const p = this.progreso();
    if (!p) return null;

    const total = Number(p.total_semestres ?? 0);
    const actual = Number(p.semestre_actual ?? 0);

    if (!total || total <= 0) return null;
    if (!actual || actual <= 0) return 0;

    const val = Math.round((actual / total) * 100);
    return Math.max(0, Math.min(100, val));
  }

  /**
   * Si la API trae notas como "4,2" (coma), esto lo normaliza
   */
  toNum(x: string | number | null | undefined): number | null {
    if (x === null || x === undefined || x === '') return null;
    const n = Number(String(x).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  personalEmail(): string | null {
    const p: any = this.personal();
    const v = (p?.email ?? p?.correo ?? p?.mail ?? '').toString().trim();
    return v || null;
    }

    personalTelefono(): string | null {
    const p: any = this.personal();
    const v = (p?.telefono ?? p?.contacto ?? p?.celular ?? '').toString().trim();
    return v || null;
    }

    docLabel(d: any): string {
    return String(d?.nombre ?? d?.archivo ?? d?.file_name ?? 'Documento');
    }

    hasProgreso(): boolean {
    const pr = this.progreso();
    const total = Number(pr?.total_semestres ?? 0);
    const actual = Number(pr?.semestre_actual ?? 0);
    return Number.isFinite(total) && total > 0 && Number.isFinite(actual) && actual > 0;
    }

    progresoSteps(): number[] {
    const total = Number(this.progreso()?.total_semestres ?? 0);
    const n = Number.isFinite(total) && total > 0 ? total : 0;
    return Array.from({ length: n }, (_, i) => i);
    }
}
