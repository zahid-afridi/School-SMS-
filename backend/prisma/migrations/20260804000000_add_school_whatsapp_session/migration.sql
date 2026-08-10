-- Add whatsappSessionId to School so each school owns its own OpenWA session
ALTER TABLE "School" ADD COLUMN "whatsappSessionId" TEXT;
