import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController, ExamTimetableController } from './exams.controller';

@Module({
  controllers: [ExamsController, ExamTimetableController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
