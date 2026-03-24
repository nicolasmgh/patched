-- DropForeignKey
ALTER TABLE "ReportSuggestion" DROP CONSTRAINT "ReportSuggestion_reportId_fkey";

-- AlterTable
ALTER TABLE "ReportSuggestion" ALTER COLUMN "reportId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ReportSuggestion" ADD CONSTRAINT "ReportSuggestion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
