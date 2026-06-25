// ── Auth domain types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student" | "parent";
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ── Request / Response shapes ──────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: User["role"];
}

export interface AuthResponse {
  user: User;
  token: string;
}
