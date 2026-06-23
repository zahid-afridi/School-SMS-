
import MarketingPanel from "../components/MarketingPanel";
import RegisterForm from "../components/RegisterForm";
import PublicRoute from "../components/PublicRoute";

export default function RegisterPage() {
  return (
    <PublicRoute>
      <main
        className="
          w-full max-w-[1000px]
          h-screen
          bg-white
          rounded-xl
          shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)]
          overflow-hidden
          flex mx-auto flex-col md:flex-row
          reveal-up
        "
      >
        <RegisterForm />
        <MarketingPanel />
      </main>
    </PublicRoute>
  );
}