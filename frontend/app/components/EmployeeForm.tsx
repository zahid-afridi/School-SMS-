"use client";

import React, { useState } from "react";
import api from "../server/Api";
import toast from "react-hot-toast";

export default function EmployeeForm() {
  const [teacher, setTeacher] = useState({
    fullName: "",
    fatherName: "",
    gender: "",
    dob: "",
    bloodGroup: "",
    cnic: "",
    phone: "",
    nationality: "",
    religion: "",
    address: "",
    designation: "",
    salary: "",
    experience: "",
    joiningDate: "",
    qualification: "",
    university: "",
    passingYear: "",
    certifications: "",
    photo: null,
  });

  // ================= HANDLE CHANGE =================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setTeacher((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ================= IMAGE =================
  const handleImage = (e) => {
    const file = e.target.files[0];

    setTeacher((prev) => ({
      ...prev,
      photo: file,
    }));
  };

  // ================= VALIDATION =================
  const validateForm = () => {
    if (!teacher.fullName) return "Full name is required";
    if (!teacher.designation) return "Designation is required";
    if (!teacher.salary) return "Salary is required";
    if (!teacher.joiningDate) return "Joining date is required";
    return null;
  };

  // ================= SUBMIT =================
  const hanldeSubmitTeacher = async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const formData = new FormData();

      // IMPORTANT: MAP TO BACKEND FIELDS
      formData.append("name", teacher.fullName);
      formData.append("designation", teacher.designation);
      formData.append("joiningDate", teacher.joiningDate);
      formData.append("salary", teacher.salary);
      formData.append("phone", teacher.phone);
      formData.append("gender", teacher.gender);
      formData.append("experience", teacher.experience);
      formData.append("nationalId", teacher.cnic);
      formData.append("religion", teacher.religion);
      formData.append("education", teacher.qualification);
      formData.append("bloodGroup", teacher.bloodGroup);
      formData.append("dateOfBirth", teacher.dob);
      formData.append("address", teacher.address);
      
      

      if (teacher.photo) {
        formData.append("photo", teacher.photo);
      }

      const res = await api.post(
        "/api/employee/register-employee",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Response:", res.data);

      toast.success("Employee created successfully!");

      // RESET
      setTeacher({
        fullName: "",
        fatherName: "",
        gender: "",
        dob: "",
        bloodGroup: "",
        cnic: "",
        phone: "",
        nationality: "",
        religion: "",
        address: "",
        designation: "",
        salary: "",
        experience: "",
        joiningDate: "",
        qualification: "",
        university: "",
        passingYear: "",
        certifications: "",
        photo: null,
      });

    } catch (error) {
      console.log("error", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="w-full max-w-5xl">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Employee Registration</h1>
          <p className="text-gray-500">Add Employee Information</p>
        </div>

        <form className="space-y-6" onSubmit={hanldeSubmitTeacher}>

          {/* PERSONAL */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <input className="input" name="fullName" value={teacher.fullName} onChange={handleChange} placeholder="Full Name" />
              <input className="input" name="fatherName" value={teacher.fatherName} onChange={handleChange} placeholder="Father Name" />

              <select className="input" name="gender" value={teacher.gender} onChange={handleChange}>
                <option value="">Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>

              <input className="input" type="date" name="dob" value={teacher.dob} onChange={handleChange} />
              <input className="input" name="bloodGroup" value={teacher.bloodGroup} onChange={handleChange} placeholder="Blood Group" />
              <input className="input" name="cnic" value={teacher.cnic} onChange={handleChange} placeholder="CNIC" />
              <input className="input" name="phone" value={teacher.phone} onChange={handleChange} placeholder="Phone" />
              <input className="input" name="nationality" value={teacher.nationality} onChange={handleChange} placeholder="Nationality" />
              <input className="input" name="religion" value={teacher.religion} onChange={handleChange} placeholder="Religion" />
            </div>

            <textarea className="input w-full mt-4" rows={3} name="address" value={teacher.address} onChange={handleChange} placeholder="Address" />
          </div>

          {/* EMPLOYMENT */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <input className="input" name="designation" value={teacher.designation} onChange={handleChange} placeholder="Designation" />
            <input className="input" type="number" name="salary" value={teacher.salary} onChange={handleChange} placeholder="Salary" />
            <input className="input" type="number" name="experience" value={teacher.experience} onChange={handleChange} placeholder="Experience" />
            <input className="input" type="date" name="joiningDate" value={teacher.joiningDate} onChange={handleChange} />
          </div>

          {/* EDUCATION */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <input className="input" name="qualification" value={teacher.qualification} onChange={handleChange} placeholder="Qualification" />
            <input className="input" name="university" value={teacher.university} onChange={handleChange} placeholder="University" />
            <input className="input" type="number" name="passingYear" value={teacher.passingYear} onChange={handleChange} placeholder="Passing Year" />
            <input className="input" name="certifications" value={teacher.certifications} onChange={handleChange} placeholder="Certifications" />
          </div>

          {/* IMAGE */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <input type="file" onChange={handleImage} />
          </div>

          {/* BUTTON */}
          <div className="flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">
              Save Employee
            </button>
          </div>

        </form>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          margin: 5px 0;
        }

        .input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
}