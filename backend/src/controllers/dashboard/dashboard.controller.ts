import type { Request, Response } from "express";
import { ApiMessages } from "../../constants/messages.js";
import { HttpStatus } from "../../constants/httpStatus.js";
import { getPrisma } from "../../lib/prisma.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function requireSchoolId(req: Request): string {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }
  return schoolId;
}

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function summarizeAttendance(
  entries: Array<{ status: "PRESENT" | "LEAVE" | "ABSENT" }>,
  totalPeople: number
) {
  const present = entries.filter((e) => e.status === "PRESENT").length;
  const leave = entries.filter((e) => e.status === "LEAVE").length;
  const absent = entries.filter((e) => e.status === "ABSENT").length;
  const marked = entries.length;

  return {
    present,
    leave,
    absent,
    marked,
    total: totalPeople,
    percentage:
      marked > 0 ? Math.round((present / marked) * 1000) / 10 : 0,
  };
}

/** GET /dashboard/stats */
export const getDashboardStats = async (req: Request, res: Response) => {
  const schoolId = requireSchoolId(req);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const dateKey = todayKey();
  const startOfDay = new Date(year, month - 1, now.getDate());
  const endOfDay = new Date(year, month - 1, now.getDate() + 1);

  const [
    school,
    totalStudents,
    activeStudents,
    totalTeachers,
    totalStaff,
    totalClasses,
    totalSections,
    totalParents,
    billedAgg,
    paidAgg,
    unpaidAgg,
    monthInvoices,
    todayPayments,
    defaulterGroups,
    studentAttendanceEntries,
    staffAttendanceEntries,
    activeExams,
    upcomingExams,
    recentPayments,
  ] = await Promise.all([
    getPrisma().school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true },
    }),
    getPrisma().student.count({ where: { schoolId } }),
    getPrisma().student.count({ where: { schoolId, status: "ACTIVE" } }),
    getPrisma().employee.count({
      where: { schoolId, status: "ACTIVE", designation: "TEACHER" },
    }),
    getPrisma().employee.count({ where: { schoolId, status: "ACTIVE" } }),
    getPrisma().class.count({ where: { schoolId } }),
    getPrisma().section.count({ where: { class: { schoolId } } }),
    getPrisma().parent.count({ where: { schoolId } }),
    getPrisma().feeInvoice.aggregate({
      where: { schoolId, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
    }),
    getPrisma().feePayment.aggregate({
      where: { schoolId },
      _sum: { amount: true },
    }),
    getPrisma().feeInvoice.aggregate({
      where: {
        schoolId,
        status: { in: ["UNPAID", "PARTIAL"] },
      },
      _sum: { balanceAmount: true },
      _count: true,
    }),
    getPrisma().feeInvoice.aggregate({
      where: {
        schoolId,
        billingMonth: month,
        billingYear: year,
        status: { not: "CANCELLED" },
      },
      _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
      _count: true,
    }),
    getPrisma().feePayment.aggregate({
      where: {
        schoolId,
        paidAt: { gte: startOfDay, lt: endOfDay },
      },
      _sum: { amount: true },
      _count: true,
    }),
    getPrisma().feeInvoice.groupBy({
      by: ["studentId"],
      where: {
        schoolId,
        status: { in: ["UNPAID", "PARTIAL"] },
        balanceAmount: { gt: 0 },
      },
    }),
    getPrisma().studentAttendanceEntry.findMany({
      where: { sheet: { schoolId, dateKey } },
      select: { status: true },
    }),
    getPrisma().staffAttendanceEntry.findMany({
      where: { sheet: { schoolId, dateKey } },
      select: { status: true },
    }),
    getPrisma().exam.count({
      where: {
        schoolId,
        status: { in: ["SCHEDULED", "ONGOING"] },
      },
    }),
    getPrisma().exam.findMany({
      where: {
        schoolId,
        status: { in: ["SCHEDULED", "ONGOING"] },
        startDate: { gte: startOfDay },
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    }),
    getPrisma().feePayment.findMany({
      where: { schoolId },
      orderBy: { paidAt: "desc" },
      take: 5,
      select: {
        id: true,
        receiptNo: true,
        amount: true,
        method: true,
        paidAt: true,
        student: {
          select: { id: true, name: true, registrationNo: true },
        },
      },
    }),
  ]);

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: {
      school: school ?? { id: schoolId, name: "School" },
      counts: {
        students: totalStudents,
        activeStudents,
        teachers: totalTeachers,
        staff: totalStaff,
        classes: totalClasses,
        sections: totalSections,
        parents: totalParents,
      },
      fees: {
        totalBilled: roundMoney(billedAgg._sum.totalAmount ?? 0),
        totalCollected: roundMoney(paidAgg._sum.amount ?? 0),
        totalOutstanding: roundMoney(unpaidAgg._sum.balanceAmount ?? 0),
        unpaidInvoiceCount: unpaidAgg._count,
        defaulterCount: defaulterGroups.length,
        thisMonth: {
          label: `${MONTH_NAMES[month - 1]} ${year}`,
          billed: roundMoney(monthInvoices._sum.totalAmount ?? 0),
          collected: roundMoney(monthInvoices._sum.paidAmount ?? 0),
          outstanding: roundMoney(monthInvoices._sum.balanceAmount ?? 0),
          invoiceCount: monthInvoices._count,
        },
        today: {
          collected: roundMoney(todayPayments._sum.amount ?? 0),
          paymentCount: todayPayments._count,
        },
      },
      attendance: {
        date: dateKey,
        students: summarizeAttendance(studentAttendanceEntries, activeStudents),
        staff: summarizeAttendance(staffAttendanceEntries, totalStaff),
      },
      exams: {
        active: activeExams,
        upcoming: upcomingExams.map((exam) => ({
          id: exam.id,
          name: exam.name,
          status: exam.status,
          startDate: exam.startDate.toISOString(),
          endDate: exam.endDate?.toISOString() ?? null,
        })),
      },
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        receiptNo: payment.receiptNo,
        amount: roundMoney(payment.amount),
        method: payment.method,
        paidAt: payment.paidAt.toISOString(),
        student: payment.student,
      })),
    },
  });
};
