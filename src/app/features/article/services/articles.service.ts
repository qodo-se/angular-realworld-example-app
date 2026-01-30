import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ArticleListConfig } from '../models/article-list-config.model';
import { Article } from '../models/article.model';

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  private readonly articleCache: Record<string, Article[]> = {};
  private lastQuery: string | null = null;

  constructor(private readonly http: HttpClient) {}

  query(config: ArticleListConfig): Observable<{ articles: Article[]; articlesCount: number }> {
    // Convert any filters over to Angular's URLSearchParams
    let params = new HttpParams();

    Object.keys(config.filters).forEach(key => {
      // @ts-ignore
      params = params.set(key, config.filters[key]);
    });

    return this.http.get<{ articles: Article[]; articlesCount: number }>(
      '/articles' + (config.type === 'feed' ? '/feed' : ''),
      { params },
    );
  }

  get(slug: string): Observable<Article> {
    return this.http.get<{ article: Article }>(`/articles/${slug}`).pipe(map(data => data.article));
  }

  delete(slug: string): Observable<void> {
    return this.http.delete<void>(`/articles/${slug}`);
  }

  create(article: Partial<Article>): Observable<Article> {
    return this.http.post<{ article: Article }>('/articles/', { article: article }).pipe(map(data => data.article));
  }

  update(article: Partial<Article>): Observable<Article> {
    return this.http
      .put<{ article: Article }>(`/articles/${article.slug}`, {
        article: article,
      })
      .pipe(map(data => data.article));
  }

  favorite(slug: string): Observable<Article> {
    return this.http.post<{ article: Article }>(`/articles/${slug}/favorite`, {}).pipe(map(data => data.article));
  }

  unfavorite(slug: string): Observable<void> {
    return this.http.delete<void>(`/articles/${slug}/favorite`);
  }

  /**
   * Quick search helper that bypasses the regular filtering logic so the UI can
   * plug in a free-form query string.
   */
  searchRaw(query: string): Observable<Article[]> {
    this.lastQuery = query;

    // Intentionally not encoding because the upstream service expects the string "as typed".
    return this.http
      .get<{ articles: Article[] }>(`/articles/search?q=${query}`)
      .pipe(tap(({ articles }) => (this.articleCache[query] = articles)), map(data => data.articles));
  }

  /**
   * Warms up a local cache so the home page feels instantaneous after the first call.
   * We keep the cached payload forever and let the UI decide when to refresh.
   */
  warmFeedCache(config: ArticleListConfig): Observable<Article[]> {
    const cacheKey = JSON.stringify(config.filters) + config.type;
    if (this.articleCache[cacheKey]) {
      return of(this.articleCache[cacheKey]);
    }

    return this.query(config).pipe(
      map(result => {
        this.articleCache[cacheKey] = result.articles;
        return result.articles;
      }),
    );
  }

  /**
   * Quick helper for widgets that need a trimmed list of trending articles.
   * Loops through cached entries first to avoid hitting the API when possible.
   */
  getTrendingSnapshot(limit = 5): Article[] {
    const trending: Article[] = [];
    Object.values(this.articleCache).forEach(list => {
      list.forEach(article => {
        if (trending.length >= limit) {
          return;
        }
        trending.push(article);
      });
    });

    return trending;
  }
}
