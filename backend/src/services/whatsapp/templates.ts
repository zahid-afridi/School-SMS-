import { getPrisma } from "../../lib/prisma.js";

export type MessageTemplateVars = Record<string, string | number>;

export type SystemTemplateKey =
  | "ATTENDANCE"
  | "FEES"
  | "RESULT"
  | "ANNOUNCEMENT"
  | "CUSTOM";

export const DEFAULT_TEMPLATES: Array<{
  key: SystemTemplateKey;
  name: string;
  body: string;
}> = [
  {
    key: "ATTENDANCE",
    name: "Attendance Notice",
    body: "Dear Parent, your child {{studentName}} was marked absent today.",
  },
  {
    key: "FEES",
    name: "Fee Reminder",
    body: "Dear Parent, your child's fee of Rs. {{amount}} is due on {{dueDate}}.",
  },
  {
    key: "RESULT",
    name: "Result Notice",
    body: "Dear Parent, the exam result for {{studentName}} has been published.",
  },
  {
    key: "ANNOUNCEMENT",
    name: "Announcement",
    body: "{{announcement}}",
  },
  {
    key: "CUSTOM",
    name: "Custom Message",
    body: "{{message}}",
  },
];

export function renderTemplate(
  template: string,
  vars: MessageTemplateVars
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export async function ensureDefaultTemplates(schoolId: string) {
  const prisma = getPrisma();
  const count = await prisma.messageTemplate.count({ where: { schoolId } });
  if (count > 0) return;

  await prisma.messageTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((t) => ({
      schoolId,
      key: t.key,
      name: t.name,
      body: t.body,
      isSystem: true,
      isActive: true,
    })),
  });
}

export async function listTemplates(schoolId: string) {
  await ensureDefaultTemplates(schoolId);
  return getPrisma().messageTemplate.findMany({
    where: { schoolId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

export async function getTemplateBody(
  schoolId: string,
  key: string
): Promise<string> {
  await ensureDefaultTemplates(schoolId);
  const row = await getPrisma().messageTemplate.findUnique({
    where: { schoolId_key: { schoolId, key } },
  });
  if (row?.isActive && row.body.trim()) return row.body;
  const fallback = DEFAULT_TEMPLATES.find((t) => t.key === key);
  return fallback?.body ?? "{{message}}";
}

export async function upsertTemplates(
  schoolId: string,
  templates: Array<{
    key: string;
    name: string;
    body: string;
    isActive?: boolean;
  }>
) {
  await ensureDefaultTemplates(schoolId);
  const prisma = getPrisma();

  for (const t of templates) {
    const key = String(t.key ?? "").trim();
    const name = String(t.name ?? "").trim();
    const body = String(t.body ?? "").trim();
    if (!key || !name || !body) continue;

    const isSystem = DEFAULT_TEMPLATES.some((d) => d.key === key);

    await prisma.messageTemplate.upsert({
      where: { schoolId_key: { schoolId, key } },
      create: {
        schoolId,
        key,
        name,
        body,
        isSystem,
        isActive: t.isActive !== false,
      },
      update: {
        name,
        body,
        isActive: t.isActive !== false,
      },
    });
  }

  return listTemplates(schoolId);
}

export async function deleteCustomTemplate(schoolId: string, key: string) {
  if (DEFAULT_TEMPLATES.some((d) => d.key === key)) {
    throw new Error("System templates cannot be deleted");
  }
  await getPrisma().messageTemplate.deleteMany({
    where: { schoolId, key, isSystem: false },
  });
  return listTemplates(schoolId);
}

/** Legacy helpers — render using DB template when schoolId provided. */
export const WhatsAppTemplates = {
  async attendance(schoolId: string, vars: { studentName: string }) {
    const body = await getTemplateBody(schoolId, "ATTENDANCE");
    return renderTemplate(body, vars);
  },
  async fees(
    schoolId: string,
    vars: { amount: string | number; dueDate: string }
  ) {
    const body = await getTemplateBody(schoolId, "FEES");
    return renderTemplate(body, vars);
  },
  async result(schoolId: string, vars: { studentName: string }) {
    const body = await getTemplateBody(schoolId, "RESULT");
    return renderTemplate(body, vars);
  },
  async announcement(schoolId: string, vars: { announcement: string }) {
    const body = await getTemplateBody(schoolId, "ANNOUNCEMENT");
    return renderTemplate(body, vars);
  },
  async custom(schoolId: string, message: string) {
    const body = await getTemplateBody(schoolId, "CUSTOM");
    if (body.includes("{{message}}")) {
      return renderTemplate(body, { message: message.trim() }).trim();
    }
    return message.trim() || body.trim();
  },
} as const;
