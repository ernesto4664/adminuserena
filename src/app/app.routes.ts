import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

import { HomeDashboardComponent } from './oame/asistencia/pages/home-dashboard/home-dashboard.component';

import { OameAsistenciaDashboardComponent } from './oame/asistencia/pages/oame-asistencia-dashboard/oame-asistencia-dashboard.component';
import { OameAsistenciaUnidadDetalleComponent } from './oame/asistencia/pages/oame-asistencia-unidad-detalle/oame-asistencia-unidad-detalle.component';
import { OameAsistenciaProgramaDetalleComponent } from './oame/asistencia/pages/oame-asistencia-programa-detalle/oame-asistencia-programa-detalle.component';
import { OameFichaEstudianteComponent } from './oame/asistencia/pages/oame-fichaestudiante/oame-fichaestudiante.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      // ✅ HOME real (Inicio)
      { path: '', component: HomeDashboardComponent, data: { title: 'Inicio' } },

      // Alias explícito
      { path: 'inicio', component: HomeDashboardComponent, data: { title: 'Inicio' } },

      // =========================
      // ✅ OAME
      // =========================
      { path: 'oame', redirectTo: 'oame/dashboard', pathMatch: 'full' },

      {
        path: 'oame/dashboard',
        component: OameAsistenciaDashboardComponent,
        data: { title: 'OAME · Monitoreo y Seguimiento' },
      },

      // 🔹 Detalle Unidad
      {
        path: 'oame/asistencia/unidades/:id',
        component: OameAsistenciaUnidadDetalleComponent,
        data: { title: 'Detalle de Unidad' },
      },

      // 🔹 Detalle Programa
      {
        path: 'oame/asistencia/programas/:id',
        component: OameAsistenciaProgramaDetalleComponent,
        data: { title: 'Detalle de Programa' },
      },

      // 🔹 Detalle - ficha estudiante OAME
      {
        path: 'oame/asistencia/ficha-estudiante/:id_usuario',
        component: OameFichaEstudianteComponent,
        data: { title: 'Ficha estudiante' },
      },

      {
        path: 'oame/asistencia',
        redirectTo: 'oame/dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
