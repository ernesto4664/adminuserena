// =========================================================
// oame/asistencia/services/oame-asistencia.service.ts
// ✅ con cache (bypass NO cachea) + keys estables
// =========================================================
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../../environment/environment';
import {
  ApiDetailResponse,
  ApiListResponse,
  UnidadAsistenciaRow,
  UnidadDetallePayload,
  ProgramaDetallePayload,
} from '../models/asistencia.models';

import { AppCacheService } from '../../../shared/cache/app-cache.service';

@Injectable({ providedIn: 'root' })
export class OameAsistenciaService {
  private http = inject(HttpClient);
  private cache = inject(AppCacheService);

  /**
   * environment.apiBaseUrl = SOLO host (sin /api)
   *  - http://localhost:8000
   *  - https://api.tudominio.cl
   */
  private base = `${environment.apiBaseUrl}/api/v1/oame/asistencia`;

  // =========================
  // TTLs (ajústalos si quieres)
  // =========================
  private readonly TTL_LISTAR_UNIDADES = 60 * 60 * 1000;      // 1h
  private readonly TTL_DETALLE_UNIDAD = 3 * 60 * 60 * 1000;   // 3h
  private readonly TTL_PROGRAMA_DETALLE = 60 * 60 * 1000;     // 1h

  // ==========================================================
  // Cache Keys (estables)
  // ==========================================================
  private keyListarUnidades(semestre: number, q?: string): string {
    const qq = (q ?? '').trim().toLowerCase();
    return `oame:unidades:${semestre}:${qq || 'all'}`;
  }

  private keyDetalleUnidad(idUnidad: number, semestre: number): string {
    return `oame:unidad:${idUnidad}:${semestre}`;
  }

  private keyProgramaDetalle(
    idPrograma: number,
    semestre: number,
    idUnidad?: number,
    page: number = 1,
    perPage: number = 50
  ): string {
    const u = idUnidad ?? 'na';
    return `oame:programa:${idPrograma}:${semestre}:${u}:${page}:${perPage}`;
  }

  // ==========================================================
  // API
  // ==========================================================

  listarUnidades(
    semestre: number,
    q?: string,
    opts?: { bypassCache?: boolean }
  ): Observable<ApiListResponse<UnidadAsistenciaRow>> {
    const key = this.keyListarUnidades(semestre, q);
    const bypass = !!opts?.bypassCache;

    if (!bypass) {
      const hit = this.cache.get<ApiListResponse<UnidadAsistenciaRow>>(key);
      if (hit) return of(hit);
    }

    let params = new HttpParams().set('semestre', String(semestre));
    const qq = (q ?? '').trim();
    if (qq) params = params.set('q', qq);

    return this.http
      .get<ApiListResponse<UnidadAsistenciaRow>>(`${this.base}/unidades`, { params })
      .pipe(
        tap((res) => {
          if (!bypass) this.cache.set(key, res, this.TTL_LISTAR_UNIDADES);
        }),
        catchError((e) => this.handleError(e, 'listarUnidades'))
      );
  }

  detalleUnidad(
    idUnidad: number,
    semestre: number,
    opts?: { bypassCache?: boolean }
  ): Observable<ApiDetailResponse<UnidadDetallePayload>> {
    const key = this.keyDetalleUnidad(idUnidad, semestre);
    const bypass = !!opts?.bypassCache;

    if (!bypass) {
      const hit = this.cache.get<ApiDetailResponse<UnidadDetallePayload>>(key);
      if (hit) return of(hit);
    }

    const params = new HttpParams().set('semestre', String(semestre));

    return this.http
      .get<ApiDetailResponse<UnidadDetallePayload>>(
        `${this.base}/unidades/${idUnidad}`,
        { params }
      )
      .pipe(
        tap((res) => {
          if (!bypass) this.cache.set(key, res, this.TTL_DETALLE_UNIDAD);
        }),
        catchError((e) => this.handleError(e, 'detalleUnidad'))
      );
  }

  programaDetalle(
    idPrograma: number,
    semestre: number,
    idUnidad?: number,
    page: number = 1,
    perPage: number = 50,
    opts?: { bypassCache?: boolean }
  ): Observable<ApiDetailResponse<ProgramaDetallePayload>> {
    const key = this.keyProgramaDetalle(idPrograma, semestre, idUnidad, page, perPage);
    const bypass = !!opts?.bypassCache;

    if (!bypass) {
      const hit = this.cache.get<ApiDetailResponse<ProgramaDetallePayload>>(key);
      if (hit) return of(hit);
    }

    let params = new HttpParams()
      .set('semestre', String(semestre))
      .set('page', String(page))
      .set('per_page', String(perPage));

    if (idUnidad) {
      params = params.set('id_unidad', String(idUnidad));
    }

    return this.http
      .get<ApiDetailResponse<ProgramaDetallePayload>>(
        `${this.base}/programas/${idPrograma}`,
        { params }
      )
      .pipe(
        tap((res) => {
          if (!bypass) this.cache.set(key, res, this.TTL_PROGRAMA_DETALLE);
        }),
        catchError((e) => this.handleError(e, 'programaDetalle'))
      );
  }

  // ==========================================================
  // Error handler (tu versión, intacta)
  // ==========================================================
  private handleError(err: unknown, op: string) {
    if (err instanceof HttpErrorResponse) {
      const url = err.url ?? '(sin url)';
      const payload = err.error ?? null;

      console.error(`[OameAsistenciaService.${op}] HTTP ${err.status} ${err.statusText}`, {
        url,
        payload,
      });

      return throwError(() => ({
        op,
        status: err.status,
        statusText: err.statusText,
        url,
        error: payload,
        message:
          payload?.message ||
          payload?.detail ||
          (typeof payload === 'string' ? payload : null) ||
          `Error HTTP ${err.status} en ${op}`,
      }));
    }

    console.error(`[OameAsistenciaService.${op}] Error desconocido`, err);
    return throwError(() => ({
      op,
      status: 0,
      statusText: 'Unknown Error',
      url: null,
      error: err,
      message: `Error desconocido en ${op}`,
    }));
  }
}
