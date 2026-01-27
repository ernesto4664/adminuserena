import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environment/environment';

export const apiBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo prefija si es URL relativa (/oame/..., /auth/..., etc.)
  if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
    return next(req);
  }

  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const path = req.url.startsWith('/') ? req.url : `/${req.url}`;
  return next(req.clone({ url: `${base}${path}` }));
};
