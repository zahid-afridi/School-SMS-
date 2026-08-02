export interface School {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  /** Versioned JSON document design profile. */
  documentDesign?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: School;
}

export interface SchoolsResponse {
  success?: boolean;
  statusCode?: number;
  message: string;
  data: School[];
}

export interface SchoolState {
  mySchool: School | null;
  schools: School[];
}
