ALTER TABLE "employees" ADD COLUMN "primarySubjectId" TEXT;

ALTER TABLE "employees"
ADD CONSTRAINT "employees_primarySubjectId_fkey"
FOREIGN KEY ("primarySubjectId") REFERENCES "subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "employees_primarySubjectId_idx" ON "employees"("primarySubjectId");
