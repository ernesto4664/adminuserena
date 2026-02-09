import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import {
  PaginatedResponse,
  UmdDocenteListItem,
  UmdFichaDocente,
  UmdFichaResponse,
  UmdGestorListItem,
  UmdFichaGestor,
  UmdListQuery,
} from './umd.types';

@Injectable({ providedIn: 'root' })
export class UmdService {
  private http = inject(HttpClient);

  // Base: http://127.0.0.1:8000/api/v1/umd
  private baseUrl = this.joinUrl(environment.apiBaseUrl, '/api/v1/umd');

  // =========================
  // DOCENTES
  // =========================
    getDocentes(params: {
    anio: number;
    q?: string;
    unidad?: string;       // ✅ nombre unidad
    id_unidad?: number;    // (si lo sigues usando en otro lado)
    id_programa?: number;
    page: number;
    per_page: number;
    include?: string[];
    }) {
    const httpParams: any = {
        anio: params.anio,
        page: params.page,
        per_page: params.per_page,
    };

    if (params.q && params.q.trim()) httpParams.q = params.q.trim();
    if (params.unidad && params.unidad.trim()) httpParams.unidad = params.unidad.trim(); // ✅ CLAVE

    // si aún usas estos:
    if (params.id_unidad) httpParams.id_unidad = params.id_unidad;
    if (params.id_programa) httpParams.id_programa = params.id_programa;

    if (params.include?.length) httpParams.include = params.include.join(',');

    return this.http.get<any>(`${this.baseUrl}/docentes`, { params: httpParams });
    }

  getDocenteById(id_usuario: number, anio = 2025) {
    const params = this.buildParams({ anio });

    return this.http.get<UmdFichaResponse<UmdFichaDocente>>(
      `${this.baseUrl}/docentes/${id_usuario}`,
      { params }
    );
  }

  // =========================
  // GESTORES
  // =========================
  getGestores(query: UmdListQuery = {}) {
    const params = this.buildParams({
      anio: query.anio ?? 2025,
      page: query.page ?? 1,
      per_page: query.per_page ?? 20,
      q: (query.q ?? '').trim() || undefined,
      id_unidad: query.id_unidad,
      id_programa: query.id_programa,
    });

    return this.http.get<PaginatedResponse<UmdGestorListItem>>(
      `${this.baseUrl}/gestores`,
      { params }
    );
  }

  getGestorById(id_usuario: number, anio = 2025) {
    const params = this.buildParams({ anio });

    return this.http.get<UmdFichaResponse<UmdFichaGestor>>(
      `${this.baseUrl}/gestores/${id_usuario}`,
      { params }
    );
  }

  // =========================
  // Helpers
  // =========================
  private buildParams(obj: Record<string, any>): HttpParams {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined || v === '') continue;
      params = params.set(k, String(v));
    }
    return params;
  }

  private joinUrl(base: string, path: string) {
    const b = base.replace(/\/+$/, '');
    const p = path.replace(/^\/+/, '/');
    return `${b}${p}`;
  }
}
