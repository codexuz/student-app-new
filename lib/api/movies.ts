import { apiRequest, ApiError } from '@/lib/api/client';

export type MovieType = 'movie' | 'cartoon';

export interface Movie {
  id: string;
  title: string;
  type: MovieType;
  level?: string;
  views?: number;
  thumbnail?: string;
  genre?: string;
  url?: string;
}

export interface MovieDetail extends Movie {
  description?: string;
  duration?: number;
}

export async function getMovies(): Promise<Movie[]> {
  const data = await apiRequest<unknown>('/movies');
  return Array.isArray(data) ? (data as Movie[]) : [];
}

/** 404s if the movie was removed after the list was fetched. */
export async function getMovieById(id: string): Promise<MovieDetail | null> {
  try {
    return await apiRequest<MovieDetail>(`/movies/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function incrementMovieView(id: string): Promise<void> {
  await apiRequest(`/movies/${id}/view`, { method: 'PATCH' });
}
