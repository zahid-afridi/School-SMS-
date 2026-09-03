// ── Auth domain types ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  schoolId?: string | null;
  isActive?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeCode?: string;
    designation?: string;
    photoUrl?: string | null;
  } | null;
  school?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
  } | null;
}

/** @deprecated use AuthUser */
export type User = AuthUser;

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ── Request / Response shapes ──────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: string;
  name?: string;
}

export interface UpdateAccountRequest {
  email?: string;
  username?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Backend wraps the payload: { message, data: { token, user } }
export interface AuthResponse {
  message: string;
  data: {
    token: string;
    user: AuthUser;
  };
}

export interface MeResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: AuthUser;
}

export interface MessageResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data?: unknown;
}
