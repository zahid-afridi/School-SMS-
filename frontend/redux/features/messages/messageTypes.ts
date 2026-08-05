export type WhatsAppMessageType =
  | "CUSTOM"
  | "ATTENDANCE"
  | "FEES"
  | "RESULT"
  | "ANNOUNCEMENT";

export type WhatsAppMessageStatus =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "DELIVERED";

export type WhatsAppMessage = {
  id: string;
  studentId: string | null;
  phone: string;
  messageType: WhatsAppMessageType;
  message: string;
  messageId: string | null;
  status: WhatsAppMessageStatus;
  error?: string | null;
  schoolId: string;
  sentByUserId?: string | null;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    name: string;
    registrationNo: string;
  } | null;
};

export type WhatsAppHistoryResponse = {
  messages: WhatsAppMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type WhatsAppStats = {
  configured: boolean;
  totals: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    delivered: number;
  };
  byType: Array<{ messageType: WhatsAppMessageType; count: number }>;
  recent: WhatsAppMessage[];
};

export type SendCustomPayload = {
  phone?: string;
  studentId?: string;
  message: string;
};

export type SendAttendancePayload = {
  studentId: string;
  phone?: string;
  studentName?: string;
};

export type SendFeesPayload = {
  studentId?: string;
  phone?: string;
  amount: string | number;
  dueDate: string;
};

export type SendResultPayload = {
  studentId: string;
  phone?: string;
  studentName?: string;
};

export type SendAnnouncementPayload = {
  announcement: string;
  phone?: string;
  studentId?: string;
  phones?: string[];
  studentIds?: string[];
};

// ─── Session / Connection ────────────────────────────────────────────────────

export type WhatsAppSessionStatus =
  | "created"
  | "initializing"
  | "qr_ready"
  | "authenticating"
  | "action_required"
  | "ready"
  | "disconnected"
  | "failed"
  | "stopped";

export type WhatsAppSessionInfo = {
  id: string;
  name: string;
  status: WhatsAppSessionStatus;
  phone: string | null;
  pushName: string | null;
  connectedAt: string | null;
  lastActive: string | null;
  lastError: string | null;
  engineLoaded: boolean;
};

export type WhatsAppQRResult = {
  qrCode: string; // data URL
  status: WhatsAppSessionStatus;
};

export type WhatsAppPairingCodeResult = {
  pairingCode: string;
};
