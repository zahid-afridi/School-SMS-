import MarketingPanel from "../components/MarketingPanel";
import RegisterForm from "../components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 bg-[#f9f9fb]">
      <main
        className="
          w-full max-w-[1000px]
          min-h-[min(100dvh-2rem,640px)]
          md:h-[min(90dvh,720px)]
          bg-white
          rounded-xl
          shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)]
          overflow-hidden
          flex flex-col md:flex-row
          reveal-up
        "
      >
        <RegisterForm />
        <MarketingPanel />
      </main>
    </div>
  );
}
