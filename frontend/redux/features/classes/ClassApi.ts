import { rootApi } from "../../rootApi";
import { setClasses } from "./ClassSlice";
import type {
  SchoolClass,
  ClassResponse,
  ClassesResponse,
  CreateClassRequest,
  UpdateClassRequest,
  Section,
  SectionResponse,
  SectionsResponse,
  CreateSectionRequest,
  UpdateSectionRequest,
} from "./ClassTypes";

export const classApi = rootApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Classes ──────────────────────────────────────────────────────────

    getAllClasses: builder.query<SchoolClass[], void>({
      query: () => "/classes/get-all-classes",
      transformResponse: (res: ClassesResponse) => res.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setClasses(data));
      },
      providesTags: ["Classes"],
    }),

    getClassById: builder.query<SchoolClass, string>({
      query: (id) => `/classes/get-class/${id}`,
      transformResponse: (res: ClassResponse) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Classes", id }],
    }),

    createClass: builder.mutation<SchoolClass, CreateClassRequest>({
      query: (body) => ({
        url: "/classes/create-class",
        method: "POST",
        body,
      }),
      transformResponse: (res: ClassResponse) => res.data,
      invalidatesTags: ["Classes"],
    }),

    updateClass: builder.mutation<
      SchoolClass,
      { id: string; data: UpdateClassRequest }
    >({
      query: ({ id, data }) => ({
        url: `/classes/update-class/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: ClassResponse) => res.data,
      invalidatesTags: ["Classes"],
    }),

    deleteClass: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/classes/delete-class/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Classes"],
    }),

    // ── Sections ─────────────────────────────────────────────────────────

    getAllSections: builder.query<Section[], void>({
      query: () => "/classes/get-all-sections",
      transformResponse: (res: SectionsResponse) => res.data,
      providesTags: ["Classes"],
    }),

    getSectionById: builder.query<Section, string>({
      query: (id) => `/classes/get-section/${id}`,
      transformResponse: (res: SectionResponse) => res.data,
      providesTags: (_result, _error, id) => [{ type: "Classes", id }],
    }),

    createSection: builder.mutation<Section, CreateSectionRequest>({
      query: (body) => ({
        url: "/classes/create-section",
        method: "POST",
        body,
      }),
      transformResponse: (res: SectionResponse) => res.data,
      invalidatesTags: ["Classes"],
    }),

    updateSection: builder.mutation<
      Section,
      { id: string; data: UpdateSectionRequest }
    >({
      query: ({ id, data }) => ({
        url: `/classes/update-section/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: SectionResponse) => res.data,
      invalidatesTags: ["Classes"],
    }),

    deleteSection: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/classes/delete-section/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Classes"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllClassesQuery,
  useGetClassByIdQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useGetAllSectionsQuery,
  useGetSectionByIdQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
} = classApi;
