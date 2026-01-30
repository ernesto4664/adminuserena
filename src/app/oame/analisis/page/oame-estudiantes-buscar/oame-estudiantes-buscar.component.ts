import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-oame-estudiantes-buscar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './oame-estudiantes-buscar.component.html',
  styleUrl: './oame-estudiantes-buscar.component.scss',
})
export class OameEstudiantesBuscarComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  semestre = computed(() => Number(this.route.snapshot.queryParamMap.get('semestre') ?? 20252));

  idCtrl = new FormControl<string>('', { nonNullable: true });
  error = signal<string | null>(null);

  volver(): void {
    this.router.navigate(['/oame/dashboard'], { queryParams: { semestre: this.semestre() } });
  }

  irAFicha(): void {
    this.error.set(null);
    const raw = (this.idCtrl.value ?? '').trim();

    if (!raw) {
      this.error.set('Ingresa un id_usuario (numérico).');
      return;
    }

    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('El id_usuario debe ser numérico y mayor a 0.');
      return;
    }

    // ✅ reutiliza tu ruta existente de ficha
    this.router.navigate(['/oame/asistencia/ficha-estudiante', id], {
      queryParams: { semestre: this.semestre() },
    });
  }
}
