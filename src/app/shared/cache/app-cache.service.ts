// =========================================================
// app/shared/cache/app-cache.service.ts
// (la versión A que dijiste que vas a pegar)
// =========================================================
import { Injectable } from '@angular/core';

type CacheEnvelope<T> = { v: T; exp: number };

@Injectable({ providedIn: 'root' })
export class AppCacheService {
  private mem = new Map<string, CacheEnvelope<any>>();
  private readonly hasStorage =
    typeof window !== 'undefined' && typeof localStorage !== 'undefined';

  get<T>(key: string): T | null {
    const now = Date.now();

    // 1) memoria
    const hit = this.mem.get(key);
    if (hit) {
      if (hit.exp > now) return hit.v as T;
      this.mem.delete(key);
    }

    // 2) localStorage
    if (!this.hasStorage) return null;

    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      const env = JSON.parse(raw) as CacheEnvelope<T>;
      if (!env?.exp || env.exp <= now) {
        localStorage.removeItem(key);
        return null;
      }
      this.mem.set(key, env);
      return env.v;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (!ttlMs || ttlMs <= 0) return;

    const env: CacheEnvelope<T> = { v: value, exp: Date.now() + ttlMs };
    this.mem.set(key, env);

    if (!this.hasStorage) return;

    try {
      localStorage.setItem(key, JSON.stringify(env));
    } catch {
      // storage lleno: queda en memoria
    }
  }

  del(key: string): void {
    this.mem.delete(key);
    if (this.hasStorage) localStorage.removeItem(key);
  }

  clearPrefix(prefix: string): void {
    // memoria
    for (const k of Array.from(this.mem.keys())) {
      if (k.startsWith(prefix)) this.mem.delete(k);
    }

    // storage
    if (!this.hasStorage) return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) localStorage.removeItem(k);
    }
  }
}
