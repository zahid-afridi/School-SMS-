"use client";

export default function RoleSelector({ role, setRole }) {
  
  const roles = [
    {
      name: "ADMIN",
      icon: "admin_panel_settings",
    },
    {
      name: "TEACHER",
      icon: "badge",
    },
    {
      name: "STUDENT",
      icon: "person",
    },
  ];

  return (
    <div className="mb-12">
      <div className="flex gap-6">
        {roles.map((item) => (
          <button
            type="button"
            key={item.name}
            onClick={() => setRole(item.name)}
            className="flex flex-col items-center gap-2"
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                role === item.name
                  ? "bg-black"
                  : "border border-gray-300"
              }`}
            >
              <span
                className={`material-symbols-outlined text-2xl ${
                  role === item.name
                    ? "text-white"
                    : "text-gray-500"
                }`}
              >
                {item.icon}
              </span>
            </div>

            <span
              className={`text-xs font-semibold tracking-wide ${
                role === item.name
                  ? "text-black"
                  : "text-gray-500"
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