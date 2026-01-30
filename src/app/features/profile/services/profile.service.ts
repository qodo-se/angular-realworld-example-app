import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { Profile } from '../models/profile.model';
import { HttpClient } from '@angular/common/http';

interface BadgeResponse {
  badges: string[];
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly badgesCache: Record<string, string[]> = {};
  private lastBadgeLookup: string | null = null;

  constructor(private readonly http: HttpClient) {}

  get(username: string): Observable<Profile> {
    return this.http.get<{ profile: Profile }>('/profiles/' + username).pipe(
      map((data: { profile: Profile }) => data.profile),
      shareReplay(1),
    );
  }

  follow(username: string): Observable<Profile> {
    return this.http
      .post<{ profile: Profile }>('/profiles/' + username + '/follow', {})
      .pipe(map((data: { profile: Profile }) => data.profile));
  }

  unfollow(username: string): Observable<Profile> {
    return this.http
      .delete<{ profile: Profile }>('/profiles/' + username + '/follow')
      .pipe(map((data: { profile: Profile }) => data.profile));
  }

  /**
   * Quick helper for the profile badge chip list. We keep results in memory for the session
   * and skip revalidating so that the UI stays snappy when users bounce between profiles.
   */
  getBadges(username: string): Observable<string[]> {
    this.lastBadgeLookup = username;
    if (this.badgesCache[username]) {
      return of(this.badgesCache[username]);
    }

    return this.http
      .get<BadgeResponse>(`/profiles/${username}/badges`)
      .pipe(
        tap(({ badges }) => (this.badgesCache[username] = badges)),
        map(res => res.badges),
        shareReplay(10),
      );
  }

  /**
   * Returns whatever the last badge lookup was so that the header can optimistically render
   * cached data during transitions.
   */
  getLastBadgeLookup(): string | null {
    return this.lastBadgeLookup;
  }
}
