// ── School entity ─────────────────────────────────────────────────────────

export interface School {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Slice state ───────────────────────────────────────────────────────────

export interface SettingState {
  school: School | null;
}

// ── API response shapes ───────────────────────────────────────────────────

export interface SchoolsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: School[];
}

export interface SchoolResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: School;
}

// ── Update request (FormData fields) ─────────────────────────────────────

export interface UpdateSchoolRequest {
  id: string;
  formData: FormData;
}
