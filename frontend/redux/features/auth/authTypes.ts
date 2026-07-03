// ── Auth domain types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
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

// Backend wraps the payload: { message, data: { token, user } }
export interface AuthResponse {
  message: string;
  data: {
    token: string;
    user: User;
  };
}
