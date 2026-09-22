ALTER TABLE "exam_timetables" ADD COLUMN "sectionId" TEXT;

UPDATE "exam_timetables" AS timetable
SET "sectionId" = (
    SELECT section."id"
    FROM "sections" AS section
    WHERE section."classId" = timetable."classId"
    ORDER BY section."name"
    LIMIT 1
)
WHERE "sectionId" IS NULL;

DROP INDEX "exam_timetable_entries_timetableId_date_key";
CREATE INDEX "exam_timetables_sectionId_startDate_endDate_idx" ON "exam_timetables"("sectionId", "startDate", "endDate");

ALTER TABLE "exam_timetables" ADD CONSTRAINT "exam_timetables_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
