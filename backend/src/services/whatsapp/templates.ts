export type MessageTemplateVars = Record<string, string | number>;

function render(template: string, vars: MessageTemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export const WhatsAppTemplates = {
  attendance: (vars: { studentName: string }) =>
    render(
      "Dear Parent, your child {{studentName}} was marked absent today.",
      vars
    ),

  fees: (vars: { amount: string | number; dueDate: string }) =>
    render(
      "Dear Parent, your child's fee of Rs. {{amount}} is due on {{dueDate}}.",
      vars
    ),

  result: (vars: { studentName: string }) =>
    render(
      "Dear Parent, the exam result for {{studentName}} has been published.",
      vars
    ),

  announcement: (vars: { announcement: string }) =>
    render("{{announcement}}", vars),

  custom: (message: string) => message.trim(),
} as const;
