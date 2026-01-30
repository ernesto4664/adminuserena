import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-oame-acompanamientos-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './oame-acompanamientos-dashboard.component.html',
  styleUrl: './oame-acompanamientos-dashboard.component.scss',
})
export class OameAcompanamientosDashboardComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  semestre = computed(() => Number(this.route.snapshot.queryParamMap.get('semestre') ?? 20252));

  volver(): void {
    this.router.navigate(['/oame/dashboard'], { queryParams: { semestre: this.semestre() } });
  }
}
