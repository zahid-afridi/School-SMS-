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
  connectionStatus?: WhatsAppSessionStatus | null;
  connectionPhone?: string | null;
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

export type WhatsAppConfig = {
  gatewayConfigured: boolean;
  gatewaySource: "school" | "env" | "none";
  gatewayUrl: string;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  hasSession: boolean;
  envDefaultsAvailable: boolean;
};

export type SaveWhatsAppConfigPayload = {
  gatewayUrl?: string;
  gatewayApiKey?: string;
  clearSchoolGateway?: boolean;
};

export type SendCustomPayload = {
  phone?: string;
  studentId?: string;
  employeeId?: string;
  message: string;
};

export type SendAttendancePayload = {
  studentId: string;
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
  studentName?: string;
};

export type SendAnnouncementPayload = {
  announcement: string;
  phone?: string;
  studentId?: string;
  employeeId?: string;
  studentIds?: string[];
  employeeIds?: string[];
};

export type MessageTemplate = {
  id: string;
  schoolId: string;
  key: string;
  name: string;
  body: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveMessageTemplatesPayload = {
  templates: Array<{
    key: string;
    name: string;
    body: string;
    isActive?: boolean;
  }>;
};

export type MessageRecipientRole = "student" | "parent" | "teacher" | "other";

export type MessageRecipient = {
  role: MessageRecipientRole;
  id: string;
  label: string;
  subtitle?: string;
  phone: string;
  studentId?: string;
  employeeId?: string;
  studentName?: string;
  parentName?: string;
  employeeName?: string;
};

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
  qrCode: string;
  status: WhatsAppSessionStatus;
};

export type WhatsAppPairingCodeResult = {
  pairingCode: string;
};
