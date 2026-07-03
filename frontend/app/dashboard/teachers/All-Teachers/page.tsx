"use client";



import { FaEnvelope, FaPhone, FaBriefcase } from "react-icons/fa";
import { useGetAllTeachersQuery } from "@/redux/features/teachers/teacherApi";
import TeacherModal from "@/app/components/TeacherModal";
import { useState } from "react";



export default function Page() {
  const { data: teachers, isLoading, isError } = useGetAllTeachersQuery();
  const [selectedTeacher, setSelectedTeacher] = useState(null);
const [openModal, setOpenModal] = useState(false);

  const imageUrl = "http://localhost:5000";
  console.log(teachers);
  

  if (isLoading) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-500">Loading teachers...</p>
      </div>
    );
  }

  if (isError || !teachers) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-500">Failed to load teachers.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        All Teachers ({teachers.length})
      </h1>

      {teachers.length === 0 ? (
        <p className="text-gray-500">No teachers found.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teachers.map((teacher) => (
            <div
              key={teacher._id}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition"
            >
              {/* Teacher Photo */}
              <div className="flex justify-center">
                {teacher.photoUrl
 ? (
                  <img
                    src={
                      teacher.photoUrl
.startsWith("http")
                        ? teacher.photoUrl

                        : `${imageUrl}/${teacher.photoUrl
.replace(/^\//, "")}`
                    }
                    alt={teacher.name || "Teacher"}
                    className="w-20 h-20 rounded-full object-cover border"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://placehold.co/80x80?text=No+Photo";
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                    {teacher.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                )}
              </div>


              {/* Name */}
              <div className="text-center mt-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  {teacher.name}
                </h2>

                <p className="text-sm text-blue-500 font-medium mt-1">
                  {teacher.designation}
                </p>
              </div>

              {/* Details */}
              <div className="mt-5 space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FaPhone className="text-gray-400" />
                  <span>{teacher.phone || "N/A"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <FaBriefcase className="text-gray-400" />
                  <span>{teacher.experience || 0} Years Experience</span>
                </div>

                <div className="flex items-center gap-2">
                  <FaEnvelope className="text-gray-400" />
                  <span className="truncate">
                    {teacher.education || "N/A"}
                  </span>
                </div>
              </div>
              

             <button
  onClick={() => {
    setSelectedTeacher(teacher);
    setOpenModal(true);
  }}
  className="w-full mt-6 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-100 transition"
>
  View Profile
</button>
      {/* <TeacherModal/> */}

            </div>
          ))}
        </div>
      )}
      {openModal && selectedTeacher && (
  <TeacherModal
    teacher={selectedTeacher}
    onClose={() => setOpenModal(false)}
  />
)}
    </div>
  );
}