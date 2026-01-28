// =========================================================
// oame/asistencia/services/oame-fichaestudiante.service.ts
// ✅ con cache (5 horas) + include ordenado + bypass NO cachea
// =========================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../../environment/environment';
import { AppCacheService } from '../../../shared/cache/app-cache.service';

/** =============== DTOs (ligeros y seguros) =============== */

export type FichaIncludeKey =
  | 'calificaciones'
  | 'parciales'
  | 'seguimientos'
  | 'documentos'
  | 'indicadores';

export interface FichaEstudianteQuery {
  semestre: number;            // 20251 | 20252
  include?: FichaIncludeKey[]; // ['calificaciones', 'parciales', ...]
  no_cache?: boolean;          // true -> bypass cache front (+ opcional query param)
  debug?: boolean;             // true -> &debug=1
  source?: 'csv' | 'db';       // opcional
}

export interface FichaEstudianteResponse {
  data: {
    personal: { id_usuario: number; rut: string; nombre_completo: string };
    academico: {
      id_unidad: number;
      unidad: string;
      id_programa: number;
      programa: string;
      codigo_programa: string;
    };
    progreso: {
      semestre_actual: number | null;
      total_semestres: number | null;
      porcentaje: number | null;
      texto: string | null;
    };
    calificaciones: any[];
    parciales: any[];
    seguimientos: any[];
    documentos: any[];
    indicadores: any[];
  };
  meta: any;
}

@Injectable({ providedIn: 'root' })
export class OameFichaEstudianteService {
  private http = inject(HttpClient);
  private cache = inject(AppCacheService);

  // ✅ respeta tu routes.php: Route::prefix('v1/oame')...
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/oame`;

  // ✅ 5 horas como pediste
  private readonly TTL_FICHA = 5 * 60 * 60 * 1000;

  private cacheKey(idUsuario: number, q: FichaEstudianteQuery): string {
    // ✅ key estable aunque cambie el orden del array
    const include = (q.include?.length ? [...q.include].sort() : []).join(',');
    const source = q.source ?? 'auto';
    return `oame:ficha:${idUsuario}:${q.semestre}:${include || 'none'}:${source}`;
  }

  ficha(idUsuario: number, q: FichaEstudianteQuery): Observable<FichaEstudianteResponse> {
    const key = this.cacheKey(idUsuario, q);
    const bypass = !!q.no_cache;

    // ✅ cache (mem + localStorage)
    if (!bypass) {
      const hit = this.cache.get<FichaEstudianteResponse>(key);
      if (hit) return of(hit);
    }

    let params = new HttpParams().set('semestre', String(q.semestre));

    const include = (q.include?.length ? q.include : []).join(',');
    if (include) params = params.set('include', include);

    // opcional: mantener compat con backend
    if (q.no_cache) params = params.set('no_cache', '1');
    if (q.debug) params = params.set('debug', '1');
    if (q.source) params = params.set('source', q.source);

    return this.http
      .get<FichaEstudianteResponse>(
        `${this.baseUrl}/estudiantes/${idUsuario}/ficha`,
        { params }
      )
      .pipe(
        tap((res) => {
          // ✅ si bypass, NO cachea
          if (!bypass) this.cache.set(key, res, this.TTL_FICHA);
        }),
        catchError((e) => this.handleError(e, 'ficha'))
      );
  }

  private handleError(err: unknown, op: string) {
    if (err instanceof HttpErrorResponse) {
      const url = err.url ?? '(sin url)';
      const payload = err.error ?? null;

      console.error(`[OameFichaEstudianteService.${op}] HTTP ${err.status} ${err.statusText}`, {
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

    console.error(`[OameFichaEstudianteService.${op}] Error desconocido`, err);
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
