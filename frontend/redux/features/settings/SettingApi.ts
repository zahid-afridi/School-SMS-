import { rootApi } from "../../rootApi";
import { setSchool } from "./SettingSlice";
import type {
  School,
  SchoolsResponse,
  SchoolResponse,
  UpdateSchoolRequest,
} from "./SettingTypes";

export const settingApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /school/my-school
    getMySchool: builder.query<School, void>({
      query: () => "/school/my-school",
      transformResponse: (res: SchoolsResponse) => res.data[0],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (data) dispatch(setSchool(data));
      },
      providesTags: ["Settings"],
    }),

    // GET /school/get-schools
    getSchools: builder.query<School[], void>({
      query: () => "/school/get-schools",
      transformResponse: (res: SchoolsResponse) => res.data,
      providesTags: ["Settings"],
    }),

    // GET /school/get-school/:id
    getSchoolById: builder.query<School, string>({
      query: (id) => `/school/get-school/${id}`,
      transformResponse: (res: SchoolResponse) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Settings", id }],
    }),

    // PUT /school/update-school/:id  (multipart/form-data for logo/cover)
    updateSchool: builder.mutation<School, UpdateSchoolRequest>({
      query: ({ id, formData }) => ({
        url: `/school/update-school/${id}`,
        method: "PUT",
        body: formData,
      }),
      transformResponse: (res: SchoolResponse) => res.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setSchool(data));
      },
      invalidatesTags: ["Settings"],
    }),

    // DELETE /school/delete-school/:id
    deleteSchool: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/school/delete-school/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Settings"],
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
} = settingApi;
