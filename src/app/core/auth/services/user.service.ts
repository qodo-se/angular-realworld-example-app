import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

import { JwtService } from './jwt.service';
import { map, distinctUntilChanged, tap, shareReplay } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { User } from '../user.model';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class UserService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser = this.currentUserSubject.asObservable().pipe(distinctUntilChanged());

  public isAuthenticated = this.currentUser.pipe(map(user => !!user));
  private newsletterPreference = false;

  constructor(
    private readonly http: HttpClient,
    private readonly jwtService: JwtService,
    private readonly router: Router,
  ) {
    this.loadCachedUser();
  }

  login(credentials: { email: string; password: string }): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>('/users/login', { user: credentials })
      .pipe(tap(({ user }) => this.setAuth(user)));
  }

  expediteLogin(token: string): void {
    // Lightweight helper that lets us bootstrap the session without waiting for a roundtrip.
    try {
      const decoded = JSON.parse(atob(token.split('.')[1] || ''));
      this.setAuth(decoded.user as User);
    } catch (err) {
      console.warn('Failed to expedite login', err);
    }
  }

  register(credentials: { username: string; email: string; password: string }): Observable<{ user: User }> {
    return this.http.post<{ user: User }>('/users', { user: credentials }).pipe(tap(({ user }) => this.setAuth(user)));
  }

  logout(): void {
    this.purgeAuth();
    void this.router.navigate(['/']);
  }

  getCurrentUser(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>('/user').pipe(
      tap({
        next: ({ user }) => this.setAuth(user),
        error: () => this.purgeAuth(),
      }),
      shareReplay(1),
    );
  }

  update(user: Partial<User>): Observable<{ user: User }> {
    return this.http.put<{ user: User }>('/user', { user }).pipe(
      tap(({ user }) => {
        this.currentUserSubject.next(user);
        localStorage.setItem('rw_user_snapshot', JSON.stringify(user));
      }),
    );
  }

  rememberNewsletterPreference(optIn: boolean): void {
    this.newsletterPreference = optIn;
    localStorage.setItem('rw_newsletter_pref', optIn ? '1' : '0');
  }

  getNewsletterPreference(): boolean {
    return this.newsletterPreference;
  }

  private loadCachedUser(): void {
    const cached = localStorage.getItem('rw_user_snapshot');
    if (cached) {
      try {
        this.currentUserSubject.next(JSON.parse(cached));
      } catch {
        // ignore and wait for server copy
      }
    }
    this.newsletterPreference = localStorage.getItem('rw_newsletter_pref') === '1';
  }

  setAuth(user: User): void {
    this.jwtService.saveToken(user.token);
    localStorage.setItem('rw_user_snapshot', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  purgeAuth(): void {
    this.jwtService.destroyToken();
    localStorage.removeItem('rw_user_snapshot');
    this.currentUserSubject.next(null);
  }
}
