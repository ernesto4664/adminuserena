// src/app/umd/data/umd.types.ts
export type UmdFuente = 'db' | 'csv' | 'pendiente' | 'desconocida';

export interface PaginatedMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  anio?: number;
  fuente?: UmdFuente | string;
  observacion?: string;
}

export interface PaginatedLinks {
  first?: string | null;
  last?: string | null;
  prev?: string | null;
  next?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
  links?: PaginatedLinks;
}

/** ✅ Query unificado (con q) */
export interface UmdListQuery {
  anio?: number;        // default 2025
  page?: number;        // default 1
  per_page?: number;    // default 20 (max 100 en backend)
  q?: string;           // ✅ buscar
  id_unidad?: number;
  unidad?: string;  
  id_programa?: number;
}

// =========================
// Docentes
// =========================
export interface UmdDocenteListItem {
  id_usuario: number;
  rut: string;
  nombre: string;
  id_unidad: number;
  id_programa: number;
  unidad?: string | null;   // si backend lo agrega
  programa?: string | null; // si backend lo agrega
}

export interface UmdIdentificacion {
  id_usuario: number;
  rut: string | null;
  nombres: string | null;
  paterno: string | null;
  materno: string | null;
}

export interface UmdAdscripcionUnidad {
  id_unidad: number;
  nombre: string;
}

export interface UmdAdscripcionPrograma {
  id_programa: number;
  codigo: string | null;
  nombre: string | null;
}

export interface UmdFichaDocente {
  identificacion: UmdIdentificacion;
  adscripcion: {
    unidad: UmdAdscripcionUnidad | null;
    programa: UmdAdscripcionPrograma | null;
  };
  formacion_academica: { disponible: boolean; fuente: string };
  capacitaciones_umd: { disponible: boolean; fuente: string };
  actividad_docente: { disponible: boolean; fuente: string; detalle: any | null };
  encuestas_docentes: { disponible: boolean; fuente: string };
}

export interface UmdFichaResponse<T> {
  data: T;
  meta: {
    anio: number;
    fuente?: UmdFuente | string;
    estado?: string;
    observacion?: string;
  };
}

// =========================
// Gestores curriculares
// =========================
export interface UmdGestorListItem {
  id_usuario: number;
  rut: string;
  nombre: string;
  id_unidad?: number;
  id_programa?: number;
  unidad?: string | null;
  programa?: string | null;
}

export interface UmdFichaGestor {
  identificacion: UmdIdentificacion;
  rol_gestion_curricular: { disponible: boolean; fuente: string };
  adscripcion: {
    unidad: UmdAdscripcionUnidad | null;
    programa: UmdAdscripcionPrograma | null;
  };
  indicadores_gestion: { disponible: boolean; fuente: string };
  actividad_docente: { disponible: boolean; fuente: string };
}
