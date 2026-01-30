import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-oame-riesgo-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './oame-riesgo-dashboard.component.html',
  styleUrl: './oame-riesgo-dashboard.component.scss',
})
export class OameRiesgoDashboardComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  semestre = computed(() => Number(this.route.snapshot.queryParamMap.get('semestre') ?? 20252));

  volver(): void {
    this.router.navigate(['/oame/dashboard'], { queryParams: { semestre: this.semestre() } });
  }
}
