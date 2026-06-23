import { FaUserGraduate, FaChalkboardTeacher, FaMoneyBillWave } from "react-icons/fa";

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Students Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 text-sm">Total Students</h2>
              <p className="text-3xl font-bold mt-2">1,250</p>
            </div>

            <div className="bg-blue-100 p-4 rounded-full">
              <FaUserGraduate className="text-blue-600 text-2xl" />
            </div>
          </div>
        </div>

        {/* Teachers Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm ">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 text-sm">Total Teachers</h2>
              <p className="text-3xl font-bold mt-2">85</p>
            </div>

            <div className="bg-green-100 p-4 rounded-full">
              <FaChalkboardTeacher className="text-green-600 text-2xl" />
            </div>
          </div>
        </div>

        {/* Fees Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm ">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 text-sm">Fees Collected</h2>
              <p className="text-3xl font-bold mt-2">$12,500</p>
            </div>

            <div className="bg-yellow-100 p-4 rounded-full">
              <FaMoneyBillWave className="text-yellow-600 text-2xl" />
            </div>
          </div>
        </div>



<div className="bg-white p-6 rounded-xl shadow-sm ">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 text-sm">Fees Collected</h2>
              <p className="text-3xl font-bold mt-2">$12,500</p>
            </div>

            <div className="bg-yellow-100 p-4 rounded-full">
              <FaMoneyBillWave className="text-yellow-600 text-2xl" />
            </div>
          </div>
        </div><div className="bg-white p-6 rounded-xl shadow-sm ">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 text-sm">Fees Collected</h2>
              <p className="text-3xl font-bold mt-2">$12,500</p>
            </div>

            <div className="bg-yellow-100 p-4 rounded-full">
              <FaMoneyBillWave className="text-yellow-600 text-2xl" />
            </div>
          </div>
        </div><div className="bg-white p-6 rounded-xl shadow-sm ">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 text-sm">Fees Collected</h2>
              <p className="text-3xl font-bold mt-2">$12,500</p>
            </div>

            <div className="bg-yellow-100 p-4 rounded-full">
              <FaMoneyBillWave className="text-yellow-600 text-2xl" />
            </div>
          </div>
        </div><div className="bg-white p-6 rounded-xl shadow-sm ">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 text-sm">Fees Collected</h2>
              <p className="text-3xl font-bold mt-2">$12,500</p>
            </div>

            <div className="bg-yellow-100 p-4 rounded-full">
              <FaMoneyBillWave className="text-yellow-600 text-2xl" />
            </div>
          </div>
        </div><div className="bg-white p-6 rounded-xl shadow-sm ">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-500 text-sm">Fees Collected</h2>
              <p className="text-3xl font-bold mt-2">$12,500</p>
            </div>

            <div className="bg-yellow-100 p-4 rounded-full">
              <FaMoneyBillWave className="text-yellow-600 text-2xl" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}