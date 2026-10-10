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
  FeeReceiptData,
  FeeParticularItem,
  FeeChallanData,
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
        sectionId?: string;
        dueDate?: string;
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

    getFeeParticulars: builder.query<FeeParticularItem[], void>({
      query: () => "/fees/particulars",
      transformResponse: (res: ApiData<FeeParticularItem[]>) => res.data,
      providesTags: ["Fees"],
    }),

    createFeeParticular: builder.mutation<
      ApiData<FeeParticularItem>,
      {
        label: string;
        key?: string;
        sortOrder?: number;
        valueType?: "EDITABLE" | "FIXED";
      }
    >({
      query: (body) => ({
        url: "/fees/particulars",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fees"],
    }),

    updateFeeParticular: builder.mutation<
      ApiData<FeeParticularItem>,
      { id: string; label?: string; sortOrder?: number; isActive?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/fees/particulars/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Fees"],
    }),

    deleteFeeParticular: builder.mutation<
      ApiData<{ message: string }>,
      { id: string } | string
    >({
      query: (arg) => {
        const id = typeof arg === "string" ? arg : arg.id;
        return {
          url: `/fees/particulars/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Fees"],
    }),

    getFeeCollectionReport: builder.query<
      CollectionReport,
      { from?: string; to?: string; classId?: string } | void
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

    getFeeInvoiceChallan: builder.query<FeeChallanData, string>({
      query: (id) => `/fees/invoices/${id}/challan`,
      transformResponse: (res: ApiData<FeeChallanData>) => res.data,
      providesTags: (_r, _e, id) => [{ type: "Fees", id }],
    }),

    getBulkInvoiceChallans: builder.mutation<
      FeeChallanData[],
      {
        invoiceIds?: string[];
        classId?: string;
        sectionId?: string;
        billingMonth?: number;
        billingYear?: number;
        status?: string;
        search?: string;
      }
    >({
      query: (body) => ({
        url: "/fees/invoices/bulk-challan",
        method: "POST",
        body,
      }),
      transformResponse: (
        res: ApiData<{ count: number; challans: FeeChallanData[] }>
      ) => res.data.challans,
    }),

    applyInvoiceLateFine: builder.mutation<
      ApiData<FeeInvoice>,
      { id: string; amount?: number; reason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/fees/invoices/${id}/apply-fine`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fees"],
    }),

    applyBulkLateFines: builder.mutation<
      ApiData<{ appliedCount: number }>,
      {
        amount?: number;
        billingMonth?: number;
        billingYear?: number;
        classId?: string;
        reason?: string;
      }
    >({
      query: (body) => ({
        url: "/fees/invoices/apply-late-fines",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fees"],
    }),

    adjustInvoice: builder.mutation<
      ApiData<FeeInvoice>,
      {
        id: string;
        type: "DISCOUNT" | "CHARGE";
        amount: number;
        label?: string;
        reason: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/fees/invoices/${id}/adjust`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fees"],
    }),

    getFeePaymentReceipt: builder.query<FeeReceiptData, string>({
      query: (paymentId) => `/fees/payments/${paymentId}/receipt`,
      transformResponse: (res: ApiData<FeeReceiptData>) => res.data,
      providesTags: (_r, _e, id) => [{ type: "Fees", id }],
    }),

    voidFeePayment: builder.mutation<
      ApiData<{ message: string }>,
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/fees/payments/${id}/void`,
        method: "POST",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: ["Fees"],
    }),

    waiveInvoiceFine: builder.mutation<
      ApiData<{ message: string }>,
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/fees/invoices/${id}/waive-fine`,
        method: "POST",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: ["Fees"],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetFeeStructureQuery,
  useSaveFeeStructureMutation,
  useGetFeeParticularsQuery,
  useCreateFeeParticularMutation,
  useUpdateFeeParticularMutation,
  useDeleteFeeParticularMutation,
  useGetFeesDashboardQuery,
  useGetFeeInvoicesQuery,
  useLazyGetFeeInvoicesQuery,
  useGenerateFeeInvoicesMutation,
  useCollectFeePaymentMutation,
  useGetFeeDefaultersQuery,
  useLazyGetFeeDefaultersQuery,
  useGetStudentFeeLedgerQuery,
  useLazyGetStudentFeeLedgerQuery,
  usePreviewStudentFeeQuery,
  useLazyPreviewStudentFeeQuery,
  useGetFeeCollectionReportQuery,
  useLazyGetFeeCollectionReportQuery,
  useCancelFeeInvoiceMutation,
  useGetFeeInvoiceChallanQuery,
  useLazyGetFeeInvoiceChallanQuery,
  useGetBulkInvoiceChallansMutation,
  useApplyInvoiceLateFineMutation,
  useApplyBulkLateFinesMutation,
  useAdjustInvoiceMutation,
  useGetFeePaymentReceiptQuery,
  useLazyGetFeePaymentReceiptQuery,
  useVoidFeePaymentMutation,
  useWaiveInvoiceFineMutation,
} = feeApi;

