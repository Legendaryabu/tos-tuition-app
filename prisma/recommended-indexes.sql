-- ============================================================================
-- TBM OS — Recommended Database Indexes for PostgreSQL (Neon)
-- Generated: DB Audit
-- Database: PostgreSQL (Neon) — prisma/schema.prisma declares provider = "postgresql"
-- ============================================================================
-- IMPORTANT: Run these in the Neon SQL Editor.
-- Uses CREATE INDEX CONCURRENTLY to avoid locking tables in production.
-- Some indexes already exist via Prisma @@index directives — those are created
-- automatically by prisma db push / migrate. The ones below are ADDITIONAL
-- composite indexes that Prisma @@index doesn't cover, or explicit coverage
-- for query patterns that benefit from specific column ordering.
-- ============================================================================

-- ============================================================================
-- 1. USER TABLE
-- ============================================================================

-- Login lookup: db.user.findFirst({ where: { email } })
-- Prisma @@index([email]) already covers this, but IF NOT EXISTS is safe
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email ON "User"(email);

-- Filter users by institute (dashboard, admin, receipt enrichment)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_institute_id ON "User"("instituteId");

-- Composite: owner lookup for institute (used by /api/auth/login, /api/institute)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_institute_type ON "User"("instituteId", type);

-- Filter users by type + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_type_status ON "User"(type, status);

-- ============================================================================
-- 2. STUDENT TABLE
-- ============================================================================

-- Most queried column — every student list/detail/dashboard query
-- Prisma @@index([instituteId]) covers the basic case
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_institute_id ON "Student"("instituteId");

-- Composite: student list with branch filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_institute_branch ON "Student"("instituteId", "branchId");

-- Composite: student list with status filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_institute_status ON "Student"("instituteId", status);

-- Student number lookup (unique check pending, used in student search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_institute_number ON "Student"("instituteId", "studentNumber");

-- Full-text search on student name (PostgreSQL GIN index for ILIKE/contains)
-- Requires pg_trgm extension for trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_name_trgm ON "Student" USING gin("fullName" gin_trgm_ops);

-- ============================================================================
-- 3. BATCH TABLE
-- ============================================================================

-- Batch list by institute + subject (subjects list enrichment)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_institute_subject ON "Batch"("instituteId", "subjectId");

-- Batch list by institute + teacher (teacher detail enrichment)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_institute_teacher ON "Batch"("instituteId", "teacherId");

-- Batch list by institute + status (active batches filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_institute_status ON "Batch"("instituteId", status);

-- Batch count by subject
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_subject_id ON "Batch"("subjectId");

-- ============================================================================
-- 4. BATCH_STUDENT TABLE
-- ============================================================================

-- Enrollment lookup by batch + status (batch detail, attendance sheet)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_student_batch_status ON "BatchStudent"("batchId", status);

-- Enrollment lookup by student + status (student detail, enrollment check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_student_student_status ON "BatchStudent"("studentId", status);

-- ============================================================================
-- 5. CLASS_SESSION TABLE
-- ============================================================================

-- Session list by institute + date (dashboard today's classes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_session_institute_date ON "ClassSession"("instituteId", "sessionDate");

-- Session by batch + date (session list filtering, attendance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_session_institute_batch_date ON "ClassSession"("instituteId", "batchId", "sessionDate");

-- Session by teacher (teacher detail session count)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_session_teacher_id ON "ClassSession"("teacherId");

-- Sessions by status (upcoming vs completed filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_session_institute_status ON "ClassSession"("instituteId", status);

-- ============================================================================
-- 6. ATTENDANCE_RECORD TABLE
-- ============================================================================

-- Attendance by institute + marked date (dashboard 30-day attendance rate)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_institute_marked ON "AttendanceRecord"("instituteId", "markedAt");

-- Attendance by session (attendance sheet)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_session_id ON "AttendanceRecord"("classSessionId");

-- Attendance by student (student detail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_student_id ON "AttendanceRecord"("studentId");

-- Attendance by batch (attendance list filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_batch_id ON "AttendanceRecord"("batchId");

-- GroupBy status (dashboard attendance summary)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_institute_status ON "AttendanceRecord"("instituteId", status);

-- ============================================================================
-- 7. FEE_DUE TABLE
-- ============================================================================

-- Fee dues by student + status (student detail unpaid dues)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_due_student_status ON "FeeDue"("studentId", status);

-- Fee dues by institute + status (dashboard unpaid count, computeSummary)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_due_institute_status ON "FeeDue"("instituteId", status);

-- Fee dues by structure + period (generate-dues dedup check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_due_structure_period ON "FeeDue"("feeStructureId", "periodMonth", "periodYear");

-- Fee due date ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_due_institute_duedate ON "FeeDue"("instituteId", "dueDate");

-- ============================================================================
-- 8. PAYMENT TABLE
-- ============================================================================

-- Payment list by institute (payments list, dashboard revenue)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_institute_id ON "Payment"("instituteId");

-- Payment by student (student detail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_student_id ON "Payment"("studentId");

-- Composite: dashboard monthly revenue query (institute + status + date range)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_institute_status_date ON "Payment"("instituteId", status, "recordedAt");

-- ============================================================================
-- 9. RECEIPT TABLE
-- ============================================================================

-- Receipt lookup by paymentId (receipt route)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receipt_payment_id ON "Receipt"("paymentId");

-- Receipt by institute (receipt number generation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receipt_institute_id ON "Receipt"("instituteId");

-- ============================================================================
-- 10. PAYMENT_ALLOCATION TABLE
-- ============================================================================

-- Allocation by payment (payments list enrichment)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_allocation_payment ON "PaymentAllocation"("paymentId");

-- Allocation by fee due (fee due reopen check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_allocation_fee_due ON "PaymentAllocation"("feeDueId");

-- ============================================================================
-- 11. TEACHER TABLE
-- ============================================================================

-- Teacher by institute + active (teachers list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_institute_active ON "Teacher"("instituteId", "isActive");

-- ============================================================================
-- 12. SUBJECT TABLE
-- ============================================================================

-- Subject by institute + active (subjects list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subject_institute_active ON "Subject"("instituteId", "isActive");

-- ============================================================================
-- 13. FEE_STRUCTURE TABLE
-- ============================================================================

-- Fee structure by institute + active (fee structures list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structure_institute_active ON "FeeStructure"("instituteId", "isActive");

-- Fee structure by batch (batch detail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structure_batch_id ON "FeeStructure"("batchId");

-- ============================================================================
-- 14. TIMETABLE_SLOT TABLE
-- ============================================================================

-- Timetable by institute + active (timetable list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timetable_institute_active ON "TimetableSlot"("instituteId", "isActive");

-- Timetable by batch
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timetable_batch_id ON "TimetableSlot"("batchId");

-- ============================================================================
-- 15. ZOOM_MEETING TABLE
-- ============================================================================

-- Zoom meetings by institute (zoom meetings list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zoom_meeting_institute_id ON "ZoomMeeting"("instituteId");

-- Zoom meeting by session (session detail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zoom_meeting_session_id ON "ZoomMeeting"("classSessionId");

-- ============================================================================
-- 16. ACTIVITY_LOG TABLE
-- ============================================================================

-- Activity log by institute (admin activity tab)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_institute_id ON "ActivityLog"("instituteId");

-- Activity log ordering (most queries order by createdAt DESC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_created_at ON "ActivityLog"("createdAt" DESC);

-- ============================================================================
-- 17. STUDENT_TIMELINE TABLE
-- ============================================================================

-- Timeline by student (student detail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_timeline_student_id ON "StudentTimeline"("studentId");

-- ============================================================================
-- 18. STUDENT_NOTE TABLE
-- ============================================================================

-- Notes by student (student notes list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_note_student_id ON "StudentNote"("studentId");

-- ============================================================================
-- 19. NOTIFICATION TABLE
-- ============================================================================

-- Notifications by user (notification list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_id ON "Notification"("userId");

-- Notifications unread (common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_read ON "Notification"("userId", "isRead");

-- ============================================================================
-- 20. EXAM / EXAM_RESULT TABLES
-- ============================================================================

-- Exams by batch (batch detail, exam list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_batch_id ON "Exam"("batchId");

-- Exam results by exam (exam grading)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_result_exam_id ON "ExamResult"("examId");

-- Exam results by student (student detail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_result_student_id ON "ExamResult"("studentId");

-- ============================================================================
-- 21. INVOICE TABLE
-- ============================================================================

-- Invoice by student
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_student_id ON "Invoice"("studentId");

-- Invoice by institute
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_institute_id ON "Invoice"("instituteId");

-- ============================================================================
-- 22. SUBSCRIPTION TABLE
-- ============================================================================

-- Subscription by institute (institute detail)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_institute_id ON "Subscription"("instituteId");

-- ============================================================================
-- DONE — All indexes created with IF NOT EXISTS to be safe for re-runs
-- ============================================================================