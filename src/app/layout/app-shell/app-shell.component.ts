import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet, RouterModule } from '@angular/router';

import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  collapsed = signal(false);
  readonly currentYear = new Date().getFullYear();

  // ✅ Título dinámico del header
  crumbTitle = signal<string>('Inicio');

  // ✅ Submenú OAME
  oameOpen = signal(false);
  oameSemestre = signal<string>('20252');

  // ✅ Submenú UMD (UI)
  umdOpen = signal(false);

  constructor() {
    // set inicial
    queueMicrotask(() => {
      this.crumbTitle.set(this.getDeepestRouteTitle() ?? 'Inicio');
    });

    // actualizar cuando cambia la ruta
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.crumbTitle.set(this.getDeepestRouteTitle() ?? 'Inicio');
        this.syncOameSemestreFromUrl();
      });
  }

  toggleSidebar() {
    this.collapsed.update((v) => !v);
  }

  // Click flecha OAME: abre/cierra submenú SIN navegar
  toggleOameSubmenu(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.oameOpen.update((v) => !v);
  }

  // Click flecha UMD: abre/cierra submenú SIN navegar
  toggleUmdSubmenu(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.umdOpen.update((v) => !v);
  }

  // =========================
  // Helpers
  // =========================
  private getDeepestRouteTitle(): string | null {
    let ar: ActivatedRoute | null = this.route;
    while (ar?.firstChild) ar = ar.firstChild;

    const title = ar?.snapshot?.data?.['title'];
    return typeof title === 'string' && title.trim() ? title : null;
  }

  private syncOameSemestreFromUrl() {
    const tree = this.router.parseUrl(this.router.url);
    const s = tree.queryParams?.['semestre'];
    if (typeof s === 'string' && s.trim()) {
      this.oameSemestre.set(s.trim());
    }
  }
}
