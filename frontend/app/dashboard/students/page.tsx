"use client";

import { FaEnvelope, FaPhone } from "react-icons/fa";

export default function Page() {
  const teachers = [
    {
      id: 1,
      name: "Muhammad Ali",
      subject: "Computer Science",
      email: "ali@gmail.com",
      phone: "+92 300 1234567",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      id: 2,
      name: "Sara Khan",
      subject: "Mathematics",
      email: "sara@gmail.com",
      phone: "+92 300 9876543",
      image: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: 3,
      name: "Ahmad Raza",
      subject: "Physics",
      email: "ahmad@gmail.com",
      phone: "+92 301 1122334",
      image: "https://randomuser.me/api/portraits/men/65.jpg",
    },
    {
      id: 4,
      name: "Fatima Noor",
      subject: "English",
      email: "fatima@gmail.com",
      phone: "+92 302 5566778",
      image: "https://randomuser.me/api/portraits/women/68.jpg",
    },
  ];

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Teachers
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-center">
              <img
                src={teacher.image}
                alt={teacher.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            </div>

            <div className="text-center mt-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {teacher.name}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {teacher.subject}
              </p>
            </div>

            <div className="mt-5 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FaEnvelope className="text-gray-400" />
                <span>{teacher.email}</span>
              </div>

              <div className="flex items-center gap-2">
                <FaPhone className="text-gray-400" />
                <span>{teacher.phone}</span>
              </div>
            </div>

            <button className="w-full mt-6 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition">
              View Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}