CREATE TABLE "exam_timetables" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "exam_timetables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_timetable_entries" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "subjectId" TEXT,
    "date" DATE NOT NULL,
    "startTime" TIME(0),
    "endTime" TIME(0),
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "holidayTitle" TEXT,
    "maximumMarks" DECIMAL(7,2),
    "passMarks" DECIMAL(7,2),
    CONSTRAINT "exam_timetable_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_timetable_entries_timetableId_date_key" ON "exam_timetable_entries"("timetableId", "date");
CREATE INDEX "exam_timetables_classId_startDate_endDate_idx" ON "exam_timetables"("classId", "startDate", "endDate");
CREATE INDEX "exam_timetable_entries_subjectId_idx" ON "exam_timetable_entries"("subjectId");

ALTER TABLE "exam_timetables" ADD CONSTRAINT "exam_timetables_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_timetables" ADD CONSTRAINT "exam_timetables_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_timetable_entries" ADD CONSTRAINT "exam_timetable_entries_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "exam_timetables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_timetable_entries" ADD CONSTRAINT "exam_timetable_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
