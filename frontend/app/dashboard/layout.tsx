import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="print:hidden">
        <Header />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="print:hidden h-full">
          <Sidebar />
        </div>

        <main className="flex-1 min-h-0 p-6 bg-gray-100 overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
