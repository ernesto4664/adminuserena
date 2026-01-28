export interface ApiListResponse<T> {
  data: T[];
  meta?: { semestre?: number; count?: number; [k: string]: any };
}

export interface ApiDetailResponse<T> {
  data: T;
  meta?: { semestre?: number; id_unidad?: number; [k: string]: any };
}

export interface UnidadAsistenciaRow {
  id_unidad: number;
  des_unidad: string;
  total_estudiantes: number;
  estudiantes_con_asistencia: number;
  total_clases: number;
  total_asistencias: number;
  porcentaje_asistencia: string | null; // viene "90.89" o null
}

export interface ProgramaAsistenciaRow {
  id_programa: number;
  cod_programa: string;
  nombre_programa: string;
  total_estudiantes: number;
  estudiantes_con_asistencia: number;
  total_clases: number;
  total_asistencias: number;
  porcentaje_asistencia: string | null;
}

export interface UnidadDetallePayload {
  unidad: { id_unidad: number; des_unidad: string };
  totales: {
    total_estudiantes: number;
    estudiantes_con_asistencia: number;
    total_clases: number;
    total_asistencias: number;
    porcentaje_asistencia: string | null;
  };
  programas: ProgramaAsistenciaRow[];
}

export interface ProgramaDetallePayload {
  programa: {
    id_programa: number;
    nombre_programa: string;
    id_unidad: number;
    des_unidad: string;
  };
  totales: {
    total_estudiantes: number;
    estudiantes_con_asistencia: number;
    total_clases: number;
    total_asistencias: number;
    porcentaje_asistencia: string | null;
  };
  estudiantes: Array<{
    id_usuario: number;
    nombre_alumno?: string;
    rut?: string;
    total_clases: number;
    total_asistencias: number;
    porcentaje_asistencia: string | null;
  }>;
}