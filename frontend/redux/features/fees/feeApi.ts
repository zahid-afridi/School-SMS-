import { rootApi } from "../../rootApi";
import type {
  FeeScope,
  FeeStructureData,
  FeeStructureResponse,
  SaveFeeStructureRequest,
} from "./feeTypes";

function toQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

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
  }),
  overrideExisting: false,
});

export const { useGetFeeStructureQuery, useSaveFeeStructureMutation } = feeApi;
