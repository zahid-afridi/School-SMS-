import { rootApi } from "../../rootApi";
import { setTeachers } from "./teacherSlice";
import type {
  Teacher,
  TeachersResponse,
  TeacherResponse,
  RegisterTeacherResponse,
} from "./teacherTypes";

export type GetTeachersParams = {
  designation?: string;
  search?: string;
};

export const teacherApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllTeachers: builder.query<Teacher[], GetTeachersParams | void>({
      query: (params) => ({
        url: "/employee/get-all-employees",
        params: params ?? undefined,
      }),
      transformResponse: (res: TeachersResponse) => res.data,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        // Only sync full staff list into the slice (not filtered queries)
        if (!arg || (!arg.designation && !arg.search)) {
          const { data } = await queryFulfilled;
          dispatch(setTeachers(data));
        } else {
          await queryFulfilled;
        }
      },
      providesTags: ["Teachers"],
    }),

    getTeacherById: builder.query<Teacher, string>({
      query: (id) => `/employee/get-employee/${id}`,
      transformResponse: (res: TeacherResponse) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Teachers", id }],
    }),

    registerTeacher: builder.mutation<RegisterTeacherResponse, FormData>({
      query: (formData) => ({
        url: "/employee/register-employee",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Teachers"],
    }),

    updateTeacher: builder.mutation<
      TeacherResponse,
      { id: string; data: FormData }
    >({
      query: ({ id, data }) => ({
        url: `/employee/update-employee/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Teachers"],
    }),

    deleteTeacher: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/employee/delete-employee/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teachers"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllTeachersQuery,
  useGetTeacherByIdQuery,
  useRegisterTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
} = teacherApi;
