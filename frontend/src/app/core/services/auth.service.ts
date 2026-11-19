import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthSession, AuthUser } from '../models/incident.model';
import { IndexedDbService } from './indexed-db.service';

interface LoginResponse {
  status: string;
  token: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = '/api/v1/auth';

  constructor(
    private readonly http: HttpClient,
    private readonly idbService: IndexedDbService
  ) {}

  async restoreSession(): Promise<AuthUser | null> {
    const session = await this.idbService.getSession();
    return session?.user || null;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/login`, { email, password })
    );

    const session: AuthSession = {
      id: 'active_session',
      token: response.token,
      user: response.user,
      logged_in_at: new Date().toISOString(),
    };

    await this.idbService.saveSession(session);
    return response.user;
  }

  async register(
    name: string,
    email: string,
    password: string,
    department: string
  ): Promise<AuthUser> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/register`, {
        name,
        email,
        password,
        department,
      })
    );

    const session: AuthSession = {
      id: 'active_session',
      token: response.token,
      user: response.user,
      logged_in_at: new Date().toISOString(),
    };

    await this.idbService.saveSession(session);
    return response.user;
  }

  async logout(): Promise<void> {
    try {
      if (navigator.onLine) {
        await firstValueFrom(this.http.post(`${this.baseUrl}/logout`, {}));
      }
    } catch {
      // Continuar con limpieza local en IndexedDB aunque no haya red
    }
    await this.idbService.clearSession();
  }
}
