import { rootApi } from "../../rootApi";
import type {
  MessageTemplate,
  SaveMessageTemplatesPayload,
  SaveWhatsAppConfigPayload,
  SendAnnouncementPayload,
  SendAttendancePayload,
  SendCustomPayload,
  SendFeesPayload,
  SendResultPayload,
  WhatsAppConfig,
  WhatsAppHistoryResponse,
  WhatsAppMessage,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
  WhatsAppPairingCodeResult,
  WhatsAppQRResult,
  WhatsAppSessionInfo,
  WhatsAppStats,
} from "./messageTypes";

function toQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

type ApiData<T> = { message: string; data: T };

export const messageApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getWhatsAppStats: builder.query<WhatsAppStats, void>({
      query: () => "/whatsapp/stats",
      transformResponse: (res: ApiData<WhatsAppStats>) => res.data,
      providesTags: ["Messages"],
    }),

    getWhatsAppConfig: builder.query<WhatsAppConfig, void>({
      query: () => "/whatsapp/config",
      transformResponse: (res: ApiData<WhatsAppConfig>) => res.data,
      providesTags: ["Messages"],
    }),

    saveWhatsAppConfig: builder.mutation<WhatsAppConfig, SaveWhatsAppConfigPayload>({
      query: (body) => ({ url: "/whatsapp/config", method: "PUT", body }),
      transformResponse: (res: ApiData<WhatsAppConfig>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    getMessageTemplates: builder.query<MessageTemplate[], void>({
      query: () => "/whatsapp/templates",
      transformResponse: (res: ApiData<MessageTemplate[]>) => res.data,
      providesTags: ["Messages"],
    }),

    saveMessageTemplates: builder.mutation<
      MessageTemplate[],
      SaveMessageTemplatesPayload
    >({
      query: (body) => ({ url: "/whatsapp/templates", method: "PUT", body }),
      transformResponse: (res: ApiData<MessageTemplate[]>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    deleteMessageTemplate: builder.mutation<MessageTemplate[], string>({
      query: (key) => ({
        url: `/whatsapp/templates/${encodeURIComponent(key)}`,
        method: "DELETE",
      }),
      transformResponse: (res: ApiData<MessageTemplate[]>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    getWhatsAppMessages: builder.query<
      WhatsAppHistoryResponse,
      {
        search?: string;
        messageType?: WhatsAppMessageType | "";
        status?: WhatsAppMessageStatus | "";
        studentId?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => `/whatsapp/messages${toQuery(params ?? {})}`,
      transformResponse: (res: ApiData<WhatsAppHistoryResponse>) => res.data,
      providesTags: ["Messages"],
    }),

    sendCustomWhatsApp: builder.mutation<WhatsAppMessage, SendCustomPayload>({
      query: (body) => ({ url: "/whatsapp/send", method: "POST", body }),
      transformResponse: (res: ApiData<WhatsAppMessage>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    sendAttendanceWhatsApp: builder.mutation<
      WhatsAppMessage,
      SendAttendancePayload
    >({
      query: (body) => ({ url: "/whatsapp/attendance", method: "POST", body }),
      transformResponse: (res: ApiData<WhatsAppMessage>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    sendFeesWhatsApp: builder.mutation<WhatsAppMessage, SendFeesPayload>({
      query: (body) => ({ url: "/whatsapp/fees", method: "POST", body }),
      transformResponse: (res: ApiData<WhatsAppMessage>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    sendResultWhatsApp: builder.mutation<WhatsAppMessage, SendResultPayload>({
      query: (body) => ({ url: "/whatsapp/results", method: "POST", body }),
      transformResponse: (res: ApiData<WhatsAppMessage>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    sendAnnouncementWhatsApp: builder.mutation<
      {
        sent: number;
        failed: number;
        errors: string[];
        messages: WhatsAppMessage[];
      },
      SendAnnouncementPayload
    >({
      query: (body) => ({
        url: "/whatsapp/announcement",
        method: "POST",
        body,
      }),
      transformResponse: (
        res: ApiData<{
          sent: number;
          failed: number;
          errors: string[];
          messages: WhatsAppMessage[];
        }>
      ) => res.data,
      invalidatesTags: ["Messages"],
    }),

    getWhatsAppSessionStatus: builder.query<WhatsAppSessionInfo, void>({
      query: () => "/whatsapp/session/status",
      transformResponse: (res: ApiData<WhatsAppSessionInfo>) => res.data,
      providesTags: ["Messages"],
    }),

    getWhatsAppQRCode: builder.query<WhatsAppQRResult, void>({
      query: () => "/whatsapp/session/qr",
      transformResponse: (res: ApiData<WhatsAppQRResult>) => res.data,
    }),

    connectWhatsApp: builder.mutation<WhatsAppSessionInfo, void>({
      query: () => ({ url: "/whatsapp/session/connect", method: "POST" }),
      transformResponse: (res: ApiData<WhatsAppSessionInfo>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    disconnectWhatsApp: builder.mutation<WhatsAppSessionInfo, void>({
      query: () => ({ url: "/whatsapp/session/disconnect", method: "POST" }),
      transformResponse: (res: ApiData<WhatsAppSessionInfo>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    reconnectWhatsApp: builder.mutation<WhatsAppSessionInfo, void>({
      query: () => ({ url: "/whatsapp/session/reconnect", method: "POST" }),
      transformResponse: (res: ApiData<WhatsAppSessionInfo>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    logoutWhatsApp: builder.mutation<WhatsAppSessionInfo, void>({
      query: () => ({ url: "/whatsapp/session/logout", method: "POST" }),
      transformResponse: (res: ApiData<WhatsAppSessionInfo>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    resetWhatsAppSession: builder.mutation<WhatsAppConfig, void>({
      query: () => ({ url: "/whatsapp/session/reset", method: "POST" }),
      transformResponse: (res: ApiData<WhatsAppConfig>) => res.data,
      invalidatesTags: ["Messages"],
    }),

    requestWhatsAppPairingCode: builder.mutation<
      WhatsAppPairingCodeResult,
      { phoneNumber: string }
    >({
      query: (body) => ({
        url: "/whatsapp/session/pairing-code",
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiData<WhatsAppPairingCodeResult>) => res.data,
    }),
  }),
});

export const {
  useGetWhatsAppStatsQuery,
  useGetWhatsAppConfigQuery,
  useSaveWhatsAppConfigMutation,
  useGetMessageTemplatesQuery,
  useSaveMessageTemplatesMutation,
  useDeleteMessageTemplateMutation,
  useGetWhatsAppMessagesQuery,
  useSendCustomWhatsAppMutation,
  useSendAttendanceWhatsAppMutation,
  useSendFeesWhatsAppMutation,
  useSendResultWhatsAppMutation,
  useSendAnnouncementWhatsAppMutation,
  useGetWhatsAppSessionStatusQuery,
  useGetWhatsAppQRCodeQuery,
  useConnectWhatsAppMutation,
  useDisconnectWhatsAppMutation,
  useReconnectWhatsAppMutation,
  useLogoutWhatsAppMutation,
  useResetWhatsAppSessionMutation,
  useRequestWhatsAppPairingCodeMutation,
} = messageApi;
