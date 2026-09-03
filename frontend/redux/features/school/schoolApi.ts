import { rootApi } from "../../rootApi";
import { setMySchool, setSchools } from "./schoolSlice";
import type {
  School,
  SchoolResponse,
  SchoolsResponse,
} from "./schoolTypes";

export const schoolApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getMySchool: builder.query<School, void>({
      query: () => "/school/my-school",
      transformResponse: (res: SchoolResponse) => res.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setMySchool(data));
        } catch {
          // keep previous state
        }
      },
      providesTags: ["School"],
    }),

    getSchools: builder.query<School[], void>({
      query: () => "/school/get-schools",
      transformResponse: (res: SchoolsResponse) => res.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setSchools(data));
        } catch {
          // keep previous state
        }
      },
      providesTags: ["School"],
    }),

    getSchoolById: builder.query<School, string>({
      query: (id) => `/school/get-school/${id}`,
      transformResponse: (res: SchoolResponse) => res.data,
      providesTags: (_result, _error, id) => [{ type: "School", id }],
    }),

    updateSchool: builder.mutation<
      SchoolResponse,
      { id: string; data: FormData }
    >({
      query: ({ id, data }) => ({
        url: `/school/update-school/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["School"],
    }),

    deleteSchool: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/school/delete-school/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["School"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMySchoolQuery,
  useGetSchoolsQuery,
  useGetSchoolByIdQuery,
  useUpdateSchoolMutation,
  useDeleteSchoolMutation,
} = schoolApi;
