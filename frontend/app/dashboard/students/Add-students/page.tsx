"use client";

import { useState } from "react";

export default function Page() {
  const [student, setStudent] = useState({
    fullName: "",
    fatherName: "",
    gender: "",
    dob: "",
    class: "",
    section: "",
    rollNo: "",
    phone: "",
    email: "",
    address: "",
    admissionDate: "",
    bloodGroup: "",
  });

  const handleChange = (e) => {
    setStudent({
      ...student,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(student);
  };

  return (
    <div className="max-w-7xl mx-auto p-8">

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Student Registration
          </h1>

          <p className="text-gray-500 mt-2">
            Fill in the student's information below.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            <div>
              <label className="block mb-2 text-sm font-medium">
                Full Name
              </label>

              <input
                type="text"
                name="fullName"
                value={student.fullName}
                onChange={handleChange}
                placeholder="Muhammad Haroon"
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Father Name
              </label>

              <input
                type="text"
                name="fatherName"
                value={student.fatherName}
                onChange={handleChange}
                placeholder="Father Name"
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Gender
              </label>

              <select
                name="gender"
                value={student.gender}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3"
              >
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Date of Birth
              </label>

              <input
                type="date"
                name="dob"
                value={student.dob}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Class
              </label>

              <select
                name="class"
                value={student.class}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3"
              >
                <option value="">Select Class</option>
                <option>Play Group</option>
                <option>Nursery</option>
                <option>KG</option>
                <option>Class 1</option>
                <option>Class 2</option>
                <option>Class 3</option>
                <option>Class 4</option>
                <option>Class 5</option>
                <option>Class 6</option>
                <option>Class 7</option>
                <option>Class 8</option>
                <option>Class 9</option>
                <option>Class 10</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Section
              </label>

              <select
                name="section"
                value={student.section}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3"
              >
                <option value="">Select Section</option>
                <option>A</option>
                <option>B</option>
                <option>C</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Roll No
              </label>

              <input
                type="text"
                name="rollNo"
                value={student.rollNo}
                onChange={handleChange}
                placeholder="Roll Number"
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Phone Number
              </label>

              <input
                type="text"
                name="phone"
                value={student.phone}
                onChange={handleChange}
                placeholder="+92 300 1234567"
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={student.email}
                onChange={handleChange}
                placeholder="student@gmail.com"
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Admission Date
              </label>

              <input
                type="date"
                name="admissionDate"
                value={student.admissionDate}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Blood Group
              </label>

              <select
                name="bloodGroup"
                value={student.bloodGroup}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3"
              >
                <option value="">Select</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
                <option>O+</option>
                <option>O-</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block mb-2 text-sm font-medium">
                Address
              </label>

              <textarea
                rows={4}
                name="address"
                value={student.address}
                onChange={handleChange}
                placeholder="Complete Address"
                className="w-full border rounded-lg px-4 py-3 resize-none"
              ></textarea>
            </div>

          </div>

          <div className="flex justify-end gap-4 mt-8">

            <button
              type="reset"
              className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              Reset
            </button>

            <button
              type="submit"
              className="px-8 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Save Student
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}