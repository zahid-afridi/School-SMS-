import { rootApi } from "../../rootApi";
import type {
  CollectionReport,
  FeeInvoice,
  FeePayment,
  FeeScope,
  FeeStructureData,
  FeeStructureResponse,
  FeesDashboardData,
  FeeDefaulter,
  SaveFeeStructureRequest,
  StudentFeeLedger,
  StudentFeePreview,
} from "./feeTypes";

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

export const feeApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeeStructure: builder.query<
      FeeStructureData,
      { scope: FeeScope; classId?: string; studentId?: string }
    >({
      query: ({ scope, classId, studentId }) =>
        `/fees/structure${toQuery({ scope, classId, studentId })}`,
      transformResponse: (res: FeeStructureResponse) => res.data,
      providesTags: ["Fees"],
    }),

    saveFeeStructure: builder.mutation<
      FeeStructureResponse,
      SaveFeeStructureRequest
    >({
      query: (body) => ({
        url: "/fees/structure",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Fees"],
    }),

    getFeesDashboard: builder.query<FeesDashboardData, void>({
      query: () => "/fees/dashboard",
      transformResponse: (res: ApiData<FeesDashboardData>) => res.data,
      providesTags: ["Fees"],
    }),

    getFeeInvoices: builder.query<
      FeeInvoice[],
      {
        studentId?: string;
        classId?: string;
        status?: string;
        academicYear?: string;
        billingMonth?: number;
        billingYear?: number;
        search?: string;
      } | void
    >({
      query: (params) => `/fees/invoices${toQuery(params ?? {})}`,
      transformResponse: (res: ApiData<FeeInvoice[]>) => res.data,
      providesTags: ["Fees"],
    }),

    generateFeeInvoices: builder.mutation<
      ApiData<{
        created: number;
        skipped: number;
        skippedExisting?: number;
        skippedZero?: number;
        skippedError?: number;
        errors?: string[];
        monthLabel: string;
        periodsCount?: number;
        periods?: string[];
        mode?: string;
        studentCount?: number;
      }>,
      {
        mode?: "MONTH" | "CALENDAR_YEAR" | "ACADEMIC_YEAR" | "RANGE";
        billingMonth?: number;
        billingYear: number;
        fromMonth?: number;
        fromYear?: number;
        toMonth?: number;
        toYear?: number;
        academicYear?: string;
        classId?: string;
        studentId?: string;
      }
    >({
      query: (body) => ({
        url: "/fees/invoices/generate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fees"],
    }),

    collectFeePayment: builder.mutation<
      ApiData<FeePayment>,
      {
        studentId: string;
        amount: number;
        method?: string;
        invoiceIds?: string[];
        invoiceId?: string;
        paidAt?: string;
        reference?: string;
        remarks?: string;
      }
    >({
      query: (body) => ({
        url: "/fees/collect",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fees"],
    }),

    getFeeDefaulters: builder.query<
      { count: number; totalOutstanding: number; defaulters: FeeDefaulter[] },
      { classId?: string; academicYear?: string } | void
    >({
      query: (params) => `/fees/defaulters${toQuery(params ?? {})}`,
      transformResponse: (
        res: ApiData<{
          count: number;
          totalOutstanding: number;
          defaulters: FeeDefaulter[];
        }>
      ) => res.data,
      providesTags: ["Fees"],
    }),

    getStudentFeeLedger: builder.query<StudentFeeLedger, string>({
      query: (studentId) => `/fees/student/${studentId}/ledger`,
      transformResponse: (res: ApiData<StudentFeeLedger>) => res.data,
      providesTags: (_r, _e, id) => [{ type: "Fees", id }],
    }),

    previewStudentFee: builder.query<StudentFeePreview, string>({
      query: (studentId) => `/fees/preview/${studentId}`,
      transformResponse: (res: ApiData<StudentFeePreview>) => res.data,
      providesTags: ["Fees"],
    }),

    getFeeCollectionReport: builder.query<
      CollectionReport,
      { from?: string; to?: string } | void
    >({
      query: (params) => `/fees/reports/collection${toQuery(params ?? {})}`,
      transformResponse: (res: ApiData<CollectionReport>) => res.data,
      providesTags: ["Fees"],
    }),

    cancelFeeInvoice: builder.mutation<
      ApiData<FeeInvoice>,
      { id: string; remarks?: string }
    >({
      query: ({ id, remarks }) => ({
        url: `/fees/invoices/${id}/cancel`,
        method: "POST",
        body: remarks ? { remarks } : {},
      }),
      invalidatesTags: ["Fees"],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetFeeStructureQuery,
  useSaveFeeStructureMutation,
  useGetFeesDashboardQuery,
  useGetFeeInvoicesQuery,
  useGenerateFeeInvoicesMutation,
  useCollectFeePaymentMutation,
  useGetFeeDefaultersQuery,
  useGetStudentFeeLedgerQuery,
  useLazyPreviewStudentFeeQuery,
  useGetFeeCollectionReportQuery,
  useCancelFeeInvoiceMutation,
} = feeApi;
