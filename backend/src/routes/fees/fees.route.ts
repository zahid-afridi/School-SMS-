import { Router } from "express";
import {
  createFeeParticular,
  deleteFeeParticular,
  getFeeParticulars,
  getFeeStructure,
  saveFeeStructure,
  updateFeeParticular,
} from "../../controllers/fees/fees.controller.js";
import {
  adjustInvoice,
  applyBulkLateFines,
  applyInvoiceLateFine,
  cancelFeeInvoice,
  collectFeePayment,
  generateFeeInvoices,
  getBulkInvoiceChallans,
  getFeeCollectionReport,
  getFeeDefaulters,
  getFeeInvoiceById,
  getFeeInvoiceChallan,
  getFeePaymentReceipt,
  getFeesDashboard,
  getStudentFeeLedger,
  listFeeInvoices,
  previewStudentFee,
  voidFeePayment,
  waiveInvoiceFine,
} from "../../controllers/fees/feeBilling.controller.js";
import { auth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const FeesRouter = Router();

FeesRouter.get("/particulars", auth("ADMIN"), asyncHandler(getFeeParticulars));
FeesRouter.post("/particulars", auth("ADMIN"), asyncHandler(createFeeParticular));
FeesRouter.put("/particulars/:id", auth("ADMIN"), asyncHandler(updateFeeParticular));
FeesRouter.delete("/particulars/:id", auth("ADMIN"), asyncHandler(deleteFeeParticular));

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
FeesRouter.post(
  "/invoices/bulk-challan",
  auth("ADMIN"),
  asyncHandler(getBulkInvoiceChallans)
);
FeesRouter.post(
  "/invoices/apply-late-fines",
  auth("ADMIN"),
  asyncHandler(applyBulkLateFines)
);
FeesRouter.get("/invoices/:id", auth("ADMIN"), asyncHandler(getFeeInvoiceById));
FeesRouter.get(
  "/invoices/:id/challan",
  auth("ADMIN"),
  asyncHandler(getFeeInvoiceChallan)
);
FeesRouter.post(
  "/invoices/:id/apply-fine",
  auth("ADMIN"),
  asyncHandler(applyInvoiceLateFine)
);
FeesRouter.post(
  "/invoices/:id/adjust",
  auth("ADMIN"),
  asyncHandler(adjustInvoice)
);
FeesRouter.post(
  "/invoices/:id/cancel",
  auth("ADMIN"),
  asyncHandler(cancelFeeInvoice)
);
FeesRouter.post(
  "/invoices/:id/waive-fine",
  auth("ADMIN"),
  asyncHandler(waiveInvoiceFine)
);

FeesRouter.post("/collect", auth("ADMIN"), asyncHandler(collectFeePayment));
FeesRouter.post(
  "/payments/:id/void",
  auth("ADMIN"),
  asyncHandler(voidFeePayment)
);
FeesRouter.get(
  "/payments/:id/receipt",
  auth("ADMIN"),
  asyncHandler(getFeePaymentReceipt)
);

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

