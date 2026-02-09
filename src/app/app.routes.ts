import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

import { HomeDashboardComponent } from './oame/asistencia/pages/home-dashboard/home-dashboard.component';

import { OameAsistenciaDashboardComponent } from './oame/asistencia/pages/oame-asistencia-dashboard/oame-asistencia-dashboard.component';
import { OameAsistenciaUnidadDetalleComponent } from './oame/asistencia/pages/oame-asistencia-unidad-detalle/oame-asistencia-unidad-detalle.component';
import { OameAsistenciaProgramaDetalleComponent } from './oame/asistencia/pages/oame-asistencia-programa-detalle/oame-asistencia-programa-detalle.component';
import { OameFichaEstudianteComponent } from './oame/asistencia/pages/oame-fichaestudiante/oame-fichaestudiante.component';

import { OameRiesgoDashboardComponent } from './oame/analisis/page/oame-riesgo-dashboard/oame-riesgo-dashboard.component';
import { OameAlertasDashboardComponent } from './oame/analisis/page/oame-alertas-dashboard/oame-alertas-dashboard.component';
import { OameAcompanamientosDashboardComponent } from './oame/analisis/page/oame-acompanamientos-dashboard/oame-acompanamientos-dashboard.component';
import { OameEstudiantesBuscarComponent } from './oame/analisis/page/oame-estudiantes-buscar/oame-estudiantes-buscar.component';

// ✅ UMD
import { UmdDashboardComponent } from './umd/pages/umd-dashboard/umd-dashboard.component';

import { UmdDocentesListComponent } from './umd/pages/umd-docentes-list/umd-docentes-list.component';
import { UmdDocenteFichaComponent } from './umd/pages/umd-docente-ficha/umd-docente-ficha.component';

import { UmdGestoresListComponent } from './umd/pages/umd-gestores-list/umd-gestores-list.component';
import { UmdGestorFichaComponent } from './umd/pages/umd-gestor-ficha/umd-gestor-ficha.component';


export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      // HOME
      { path: '', component: HomeDashboardComponent, data: { title: 'Inicio' } },
      { path: 'inicio', component: HomeDashboardComponent, data: { title: 'Inicio' } },

      // =========================
      // OAME
      // =========================
      { path: 'oame', redirectTo: 'oame/dashboard', pathMatch: 'full' },
      {
        path: 'oame/dashboard',
        component: OameAsistenciaDashboardComponent,
        data: { title: 'OAME · Monitoreo y Seguimiento' },
      },
      {
        path: 'oame/riesgo',
        component: OameRiesgoDashboardComponent,
        data: { title: 'OAME · Riesgo académico' },
      },
      {
        path: 'oame/alertas',
        component: OameAlertasDashboardComponent,
        data: { title: 'OAME · Alertas' },
      },
      {
        path: 'oame/acompanamientos',
        component: OameAcompanamientosDashboardComponent,
        data: { title: 'OAME · Acompañamientos' },
      },
      {
        path: 'oame/estudiantes',
        component: OameEstudiantesBuscarComponent,
        data: { title: 'OAME · Estudiantes' },
      },
      {
        path: 'oame/asistencia/unidades/:id',
        component: OameAsistenciaUnidadDetalleComponent,
        data: { title: 'Detalle de Unidad' },
      },
      {
        path: 'oame/asistencia/programas/:id',
        component: OameAsistenciaProgramaDetalleComponent,
        data: { title: 'Detalle de Programa' },
      },
      {
        path: 'oame/asistencia/ficha-estudiante/:id_usuario',
        component: OameFichaEstudianteComponent,
        data: { title: 'Ficha estudiante' },
      },
      { path: 'oame/asistencia', redirectTo: 'oame/dashboard', pathMatch: 'full' },

      // =========================
      // ✅ UMD
      // =========================
      { path: 'umd', redirectTo: 'umd/dashboard', pathMatch: 'full' },
      {
        path: 'umd/dashboard',
        component: UmdDashboardComponent,
        data: { title: 'UMD · Desarrollo Docente' },
      },

      // ✅ Docentes
      {
        path: 'umd/docentes',
        component: UmdDocentesListComponent,
        data: { title: 'UMD · Docentes' },
      },
      {
        path: 'umd/docentes/:id_usuario',
        component: UmdDocenteFichaComponent,
        data: { title: 'UMD · Ficha docente' },
      },

      // ✅ Gestores curriculares
      {
        path: 'umd/gestores',
        component: UmdGestoresListComponent,
        data: { title: 'UMD · Gestores curriculares' },
      },
      {
        path: 'umd/gestores/:id_usuario',
        component: UmdGestorFichaComponent,
        data: { title: 'UMD · Ficha gestor curricular' },
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
