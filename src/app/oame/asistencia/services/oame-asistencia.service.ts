import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environment/environment';
import {
  ApiDetailResponse,
  ApiListResponse,
  UnidadAsistenciaRow,
  UnidadDetallePayload,
} from '../models/asistencia.models';

@Injectable({ providedIn: 'root' })
export class OameAsistenciaService {
  private http = inject(HttpClient);

  /**
   * environment.apiBaseUrl = SOLO host (sin /api)
   *  - http://localhost:8000
   *  - https://api.tudominio.cl
   */
  private base = `${environment.apiBaseUrl}/api/v1/oame/asistencia`;

  listarUnidades(
    semestre: number,
    q?: string
  ): Observable<ApiListResponse<UnidadAsistenciaRow>> {
    let params = new HttpParams().set('semestre', String(semestre));
    const qq = (q ?? '').trim();
    if (qq) params = params.set('q', qq);

    return this.http
      .get<ApiListResponse<UnidadAsistenciaRow>>(`${this.base}/unidades`, { params })
      .pipe(catchError((e) => this.handleError(e, 'listarUnidades')));
  }

  detalleUnidad(
    idUnidad: number,
    semestre: number
  ): Observable<ApiDetailResponse<UnidadDetallePayload>> {
    const params = new HttpParams().set('semestre', String(semestre));

    return this.http
      .get<ApiDetailResponse<UnidadDetallePayload>>(`${this.base}/unidades/${idUnidad}`, { params })
      .pipe(catchError((e) => this.handleError(e, 'detalleUnidad')));
  }

  private handleError(err: unknown, op: string) {
    if (err instanceof HttpErrorResponse) {
      const url = err.url ?? '(sin url)';
      const payload = err.error ?? null;

      console.error(`[OameAsistenciaService.${op}] HTTP ${err.status} ${err.statusText}`, {
        url,
        payload,
      });

      // 🔑 importante: dejamos message arriba para que el componente lo lea fácil
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
