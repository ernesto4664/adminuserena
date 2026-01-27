import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

import { HomeDashboardComponent } from './oame/asistencia/pages/home-dashboard/home-dashboard.component';

import { OameAsistenciaDashboardComponent } from './oame/asistencia/pages/oame-asistencia-dashboard/oame-asistencia-dashboard.component';
import { OameAsistenciaUnidadDetalleComponent } from './oame/asistencia/pages/oame-asistencia-unidad-detalle/oame-asistencia-unidad-detalle.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      // ✅ HOME real (Inicio)
      { path: '', component: HomeDashboardComponent },

      // Alias explícito
      { path: 'inicio', component: HomeDashboardComponent },

      // ✅ OAME
      { path: 'oame', redirectTo: 'oame/dashboard', pathMatch: 'full' },
      { path: 'oame/dashboard', component: OameAsistenciaDashboardComponent },
      { path: 'oame/asistencia/unidades/:id', component: OameAsistenciaUnidadDetalleComponent },
      { path: 'oame/asistencia', redirectTo: 'oame/dashboard', pathMatch: 'full' },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
