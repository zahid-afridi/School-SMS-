import type { Request } from "express";
import { HttpStatus } from "../../constants/httpStatus.js";
import { ApiMessages } from "../../constants/messages.js";
import { getPrisma } from "../../lib/prisma.js";
import { uploadImage } from "../../lib/storage.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AppError } from "../../utils/AppError.js";
import type { Response } from "express";

/** Admin can only access their own school. SUPER_ADMIN can access any. */
function assertOwnSchool(req: Request, schoolId: string) {
  if (req.user?.role === "SUPER_ADMIN") return;

  if (req.user?.schoolId !== schoolId) {
    throw new AppError(ApiMessages.FORBIDDEN, HttpStatus.FORBIDDEN);
  }
}

const getSchools = async (req: Request, res: Response) => {
  const schools = await getPrisma().school.findMany({
    where:
      req.user?.role === "SUPER_ADMIN"
        ? undefined
        : { id: req.user!.schoolId! },
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: schools,
  });
};

const getSchoolById = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  assertOwnSchool(req, id);

  const school = await getPrisma().school.findUnique({ where: { id } });
  if (!school) {
    throw new AppError(ApiMessages.SCHOOL_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return ApiResponse.success(res, { message: ApiMessages.SUCCESS, data: school });
};

const updateSchool = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  assertOwnSchool(req, id);

  const { name, address, phone, email, website } = req.body;
  const files = req.files as {
    logo?: Express.Multer.File[];
    cover?: Express.Multer.File[];
  };

  const updateData: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
    coverUrl?: string;
  } = { name, address, phone, email, website };

  if (files?.logo?.[0]) {
    const saved = await uploadImage(files.logo[0], id);
    updateData.logoUrl = saved.url;
  }

  if (files?.cover?.[0]) {
    const saved = await uploadImage(files.cover[0], id);
    updateData.coverUrl = saved.url;
  }

  const school = await getPrisma().school.update({
    where: { id },
    data: updateData,
  });

  return ApiResponse.success(res, {
    message: ApiMessages.SUCCESS,
    data: school,
  });
};

const deleteSchool = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  assertOwnSchool(req, id);

  await getPrisma().school.delete({ where: { id } });

  return ApiResponse.success(res, { message: ApiMessages.SUCCESS });
};

/** Admin gets own school — no :id needed, safer */
const getMySchool = async (req: Request, res: Response) => {
  if (!req.user?.schoolId) {
    throw new AppError(ApiMessages.SCHOOL_ACCESS_REQUIRED, HttpStatus.FORBIDDEN);
  }

  const school = await getPrisma().school.findUnique({
    where: { id: req.user.schoolId },
  });

  if (!school) {
    throw new AppError(ApiMessages.SCHOOL_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return ApiResponse.success(res, { message: ApiMessages.SUCCESS, data: school });
};

export { getSchools, updateSchool, deleteSchool, getSchoolById, getMySchool };
