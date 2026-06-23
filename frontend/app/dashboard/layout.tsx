import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import ProtectedRoute from "../components/ProtectedRoute";

export default function DashboardLayout({children,}: {children: React.ReactNode;}) {
  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />

          <main className="flex-1 p-6 bg-gray-100 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}