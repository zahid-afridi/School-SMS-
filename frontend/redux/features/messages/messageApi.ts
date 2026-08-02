import { rootApi } from "../../rootApi";
import type {
  SendAnnouncementPayload,
  SendAttendancePayload,
  SendCustomPayload,
  SendFeesPayload,
  SendResultPayload,
  WhatsAppHistoryResponse,
  WhatsAppMessage,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
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

    getWhatsAppMessage: builder.query<WhatsAppMessage, string>({
      query: (id) => `/whatsapp/messages/${id}`,
      transformResponse: (res: ApiData<WhatsAppMessage>) => res.data,
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
  }),
});

export const {
  useGetWhatsAppStatsQuery,
  useGetWhatsAppMessagesQuery,
  useGetWhatsAppMessageQuery,
  useSendCustomWhatsAppMutation,
  useSendAttendanceWhatsAppMutation,
  useSendFeesWhatsAppMutation,
  useSendResultWhatsAppMutation,
  useSendAnnouncementWhatsAppMutation,
} = messageApi;
