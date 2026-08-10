"use client";

type RoleSelectorProps = {
  role: string;
  setRole: (role: string) => void;
};

export default function RoleSelector({ role, setRole }: RoleSelectorProps) {
  const roles = [
    { name: "ADMIN", icon: "admin_panel_settings" },
    { name: "TEACHER", icon: "badge" },
    { name: "STUDENT", icon: "person" },
  ];

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex gap-4 sm:gap-6">
        {roles.map((item) => (
          <button
            type="button"
            key={item.name}
            onClick={() => setRole(item.name)}
            className="flex flex-col items-center gap-2"
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all ${
                role === item.name ? "bg-black" : "border border-gray-300"
              }`}
            >
              <span
                className={`material-symbols-outlined text-xl md:text-2xl ${
                  role === item.name ? "text-white" : "text-gray-500"
                }`}
              >
                {item.icon}
              </span>
            </div>

            <span
              className={`text-[10px] sm:text-xs font-semibold tracking-wide ${
                role === item.name ? "text-black" : "text-gray-500"
              }`}
            >
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
