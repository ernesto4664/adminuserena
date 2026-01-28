import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

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
  ],
  templateUrl: './oame-asistencia-unidad-detalle.component.html',
  styleUrl: './oame-asistencia-unidad-detalle.component.scss',
})
export class OameAsistenciaUnidadDetalleComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router); // ✅ FIX: faltaba Router
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

  cargar(): void {
    const id = this.idUnidad();
    if (!id) return;

    const sem = this.semestre();

    this.loading.set(true);
    this.error.set(null);

    this.api
      .detalleUnidad(id, sem) // ✅ tu método del service
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp: any) => {
          this.data.set(resp?.data ?? null);
          this.loading.set(false);
        },
        error: (e) => {
          console.error(e);
          this.error.set('No fue posible cargar el detalle de la unidad.');
          this.data.set(null);
          this.loading.set(false);
        },
      });
  }

  // =========================
  // Badge para % asistencia (mismo criterio que dashboard)
  // =========================
  UMBRAL_ROJO = 80;
  UMBRAL_VERDE = 90;

  badgeClass(p: number | null): string {
    if (p === null || p === undefined) return 'badge badge-muted';
    if (p < this.UMBRAL_ROJO) return 'badge badge-red';
    if (p < this.UMBRAL_VERDE) return 'badge badge-amber';
    return 'badge badge-green';
  }

  // ✅ FIX: tip correcto + queryParams con valores (no signals)
  verPrograma(p: ProgramaDTO): void {
    this.router.navigate(
      ['/oame/asistencia/programas', p.id_programa],
      {
        queryParams: {
          semestre: this.semestre(),
          id_unidad: this.idUnidad(),
        },
        queryParamsHandling: 'merge',
      }
    );
  }
}
