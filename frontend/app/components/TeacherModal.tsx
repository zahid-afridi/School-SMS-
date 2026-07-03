"use client";

import {
  FaPhone,
  FaEnvelope,
  FaBriefcase,
  FaEdit,
  FaTrash,
  FaTimes,
} from "react-icons/fa";

export default function TeacherModal({
  teacher,
  onClose,
}: {
  teacher: any;
  onClose: () => void;
}) {
  const imageUrl = "http://localhost:5000";

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">

      <div className="bg-white rounded-2xl w-[500px] max-w-[95%] shadow-2xl relative p-8">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-2xl text-gray-500 hover:text-red-500"
        >
          <FaTimes />
        </button>

        {/* Photo */}
        <div className="flex justify-center">
          {teacher.photoUrl ? (
            <img
              src={
                teacher.photoUrl.startsWith("http")
                  ? teacher.photoUrl
                  : `${imageUrl}/${teacher.photoUrl.replace(/^\//, "")}`
              }
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-blue-100 flex justify-center items-center text-5xl font-bold text-blue-600">
              {teacher.name?.charAt(0)}
            </div>
          )}
        </div>

        <h2 className="text-center text-2xl font-bold mt-5">
          {teacher.name}
        </h2>

        <p className="text-center text-blue-600 mb-8">
          {teacher.designation}
        </p>

        <div className="space-y-4">

          <div className="flex items-center gap-3">
            <FaPhone className="text-blue-500" />
            <span>{teacher.phone}</span>
          </div>

          <div className="flex items-center gap-3">
            <FaEnvelope className="text-blue-500" />
            <span>{teacher.email || "N/A"}</span>
          </div>

          <div className="flex items-center gap-3">
            <FaBriefcase className="text-blue-500" />
            <span>{teacher.experience} Years Experience</span>
          </div>

          <div>
            <h3 className="font-semibold">Education</h3>
            <p className="text-gray-600">
              {teacher.education || "N/A"}
            </p>
          </div>

          <div>
            <h3 className="font-semibold">Address</h3>
            <p className="text-gray-600">
              {teacher.address || "N/A"}
            </p>
          </div>

          <div>
            <h3 className="font-semibold">Description</h3>
            <p className="text-gray-600">
              {teacher.description || "No Description"}
            </p>
          </div>

        </div>

        <div className="flex gap-4 mt-8">

          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex justify-center items-center gap-2">
            <FaEdit />
            Update
          </button>

          <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex justify-center items-center gap-2">
            <FaTrash />
            Delete
          </button>

        </div>

      </div>
    </div>
  );
}