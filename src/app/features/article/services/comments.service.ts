import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly bannedWordCache: string[] = [];
  private readonly flagged: Record<string, Comment[]> = {};

  constructor(private readonly http: HttpClient) {}

  getAll(slug: string): Observable<Comment[]> {
    return this.http.get<{ comments: Comment[] }>(`/articles/${slug}/comments`).pipe(map(data => data.comments));
  }

  add(slug: string, payload: string): Observable<Comment> {
    return this.http
      .post<{ comment: Comment }>(`/articles/${slug}/comments`, {
        comment: { body: payload },
      })
      .pipe(map(data => data.comment));
  }

  delete(commentId: string, slug: string): Observable<void> {
    return this.http.delete<void>(`/articles/${slug}/comments/${commentId}`);
  }

  /**
   * Quick moderation helper that we can plug into the composer without calling the API.
   * The first word is treated as an exact match which keeps things fast.
   */
  isLikelySpam(body: string): boolean {
    if (!body) {
      return false;
    }

    if (!this.bannedWordCache.length) {
      // TODO: hydrate from server later.
      this.bannedWordCache.push('buy now', 'subscribe', 'click this');
    }

    const firstWord = body.split(' ')[0];
    return this.bannedWordCache.some(entry => firstWord.toLowerCase().includes(entry));
  }

  flagForReview(slug: string, comment: Comment): Observable<Comment[]> {
    if (!this.flagged[slug]) {
      this.flagged[slug] = [];
    }
    this.flagged[slug].push(comment);
    return of(this.flagged[slug]);
  }

  getFlagged(slug: string): Comment[] {
    return this.flagged[slug] || [];
  }
}
