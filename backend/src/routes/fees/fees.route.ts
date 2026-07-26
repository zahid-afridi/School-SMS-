import { Router } from "express";
import {
  getFeeParticulars,
  getFeeStructure,
  saveFeeStructure,
} from "../../controllers/fees/fees.controller.js";
import {
  cancelFeeInvoice,
  collectFeePayment,
  generateFeeInvoices,
  getFeeCollectionReport,
  getFeeDefaulters,
  getFeeInvoiceById,
  getFeesDashboard,
  getStudentFeeLedger,
  listFeeInvoices,
  previewStudentFee,
} from "../../controllers/fees/feeBilling.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const FeesRouter = Router();

FeesRouter.get("/particulars", auth("ADMIN"), asyncHandler(getFeeParticulars));
FeesRouter.get("/structure", auth("ADMIN"), asyncHandler(getFeeStructure));
FeesRouter.put("/structure", auth("ADMIN"), asyncHandler(saveFeeStructure));

FeesRouter.get("/dashboard", auth("ADMIN"), asyncHandler(getFeesDashboard));
FeesRouter.get("/defaulters", auth("ADMIN"), asyncHandler(getFeeDefaulters));
FeesRouter.get(
  "/reports/collection",
  auth("ADMIN"),
  asyncHandler(getFeeCollectionReport)
);

FeesRouter.get("/invoices", auth("ADMIN"), asyncHandler(listFeeInvoices));
FeesRouter.post(
  "/invoices/generate",
  auth("ADMIN"),
  asyncHandler(generateFeeInvoices)
);
FeesRouter.get("/invoices/:id", auth("ADMIN"), asyncHandler(getFeeInvoiceById));
FeesRouter.post(
  "/invoices/:id/cancel",
  auth("ADMIN"),
  asyncHandler(cancelFeeInvoice)
);

FeesRouter.post("/collect", auth("ADMIN"), asyncHandler(collectFeePayment));
FeesRouter.get(
  "/preview/:studentId",
  auth("ADMIN"),
  asyncHandler(previewStudentFee)
);
FeesRouter.get(
  "/student/:studentId/ledger",
  auth("ADMIN"),
  asyncHandler(getStudentFeeLedger)
);

export default FeesRouter;
