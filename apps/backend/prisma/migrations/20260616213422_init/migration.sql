-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateEnum
CREATE TYPE "app"."UserRole" AS ENUM ('user', 'premium', 'admin');

-- CreateEnum
CREATE TYPE "app"."SessionType" AS ENUM ('guest', 'learning');

-- CreateEnum
CREATE TYPE "app"."SessionStatus" AS ENUM ('active', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "app"."SubscriptionPlan" AS ENUM ('free', 'premium');

-- CreateEnum
CREATE TYPE "app"."SubscriptionStatus" AS ENUM ('active', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "app"."EventType" AS ENUM ('start_session', 'end_session', 'lesson_started', 'lesson_completed', 'certificate_issued', 'achievement_unlocked');

-- CreateTable
CREATE TABLE "app"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "app"."UserRole" NOT NULL DEFAULT 'user',
    "preferred_language_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."typing_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "session_type" "app"."SessionType" NOT NULL,
    "status" "app"."SessionStatus" NOT NULL DEFAULT 'active',
    "text_id" UUID NOT NULL,
    "lesson_id" UUID,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "cpm" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,

    CONSTRAINT "typing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."keystroke_events" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "text_id" UUID NOT NULL,
    "position_index" INTEGER NOT NULL,
    "expected_char" TEXT NOT NULL,
    "typed_char" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "reaction_time_ms" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "keystroke_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."lesson_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "cpm" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "is_passed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."certificates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpm_at_issue" DOUBLE PRECISION NOT NULL,
    "accuracy_at_issue" DOUBLE PRECISION NOT NULL,
    "file_url" TEXT NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."achievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_type" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata_json" JSONB,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "app"."SubscriptionPlan" NOT NULL,
    "status" "app"."SubscriptionStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."event_logs" (
    "id" UUID NOT NULL,
    "event_type" "app"."EventType" NOT NULL,
    "user_id" UUID,
    "session_id" UUID,
    "lesson_attempt_id" UUID,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "app"."users"("email");

-- CreateIndex
CREATE INDEX "users_preferred_language_id_idx" ON "app"."users"("preferred_language_id");

-- CreateIndex
CREATE INDEX "typing_sessions_user_id_idx" ON "app"."typing_sessions"("user_id");

-- CreateIndex
CREATE INDEX "typing_sessions_text_id_idx" ON "app"."typing_sessions"("text_id");

-- CreateIndex
CREATE INDEX "typing_sessions_started_at_idx" ON "app"."typing_sessions"("started_at");

-- CreateIndex
CREATE INDEX "typing_sessions_user_id_session_type_idx" ON "app"."typing_sessions"("user_id", "session_type");

-- CreateIndex
CREATE INDEX "keystroke_events_session_id_idx" ON "app"."keystroke_events"("session_id");

-- CreateIndex
CREATE INDEX "keystroke_events_timestamp_idx" ON "app"."keystroke_events"("timestamp");

-- CreateIndex
CREATE INDEX "keystroke_events_position_index_idx" ON "app"."keystroke_events"("position_index");

-- CreateIndex
CREATE INDEX "keystroke_events_session_id_position_index_idx" ON "app"."keystroke_events"("session_id", "position_index");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_attempts_session_id_key" ON "app"."lesson_attempts"("session_id");

-- CreateIndex
CREATE INDEX "lesson_attempts_user_id_idx" ON "app"."lesson_attempts"("user_id");

-- CreateIndex
CREATE INDEX "lesson_attempts_lesson_id_idx" ON "app"."lesson_attempts"("lesson_id");

-- CreateIndex
CREATE INDEX "lesson_attempts_user_id_lesson_id_created_at_idx" ON "app"."lesson_attempts"("user_id", "lesson_id", "created_at");

-- CreateIndex
CREATE INDEX "certificates_user_id_idx" ON "app"."certificates"("user_id");

-- CreateIndex
CREATE INDEX "certificates_course_id_idx" ON "app"."certificates"("course_id");

-- CreateIndex
CREATE INDEX "certificates_user_id_course_id_idx" ON "app"."certificates"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "achievements_user_id_idx" ON "app"."achievements"("user_id");

-- CreateIndex
CREATE INDEX "achievements_achievement_type_idx" ON "app"."achievements"("achievement_type");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "app"."subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "app"."subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "event_logs_event_type_idx" ON "app"."event_logs"("event_type");

-- CreateIndex
CREATE INDEX "event_logs_user_id_idx" ON "app"."event_logs"("user_id");

-- CreateIndex
CREATE INDEX "event_logs_session_id_idx" ON "app"."event_logs"("session_id");

-- CreateIndex
CREATE INDEX "event_logs_created_at_idx" ON "app"."event_logs"("created_at");

-- AddForeignKey
ALTER TABLE "app"."typing_sessions" ADD CONSTRAINT "typing_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."keystroke_events" ADD CONSTRAINT "keystroke_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "app"."typing_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."lesson_attempts" ADD CONSTRAINT "lesson_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."lesson_attempts" ADD CONSTRAINT "lesson_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "app"."typing_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."achievements" ADD CONSTRAINT "achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."event_logs" ADD CONSTRAINT "event_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."event_logs" ADD CONSTRAINT "event_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "app"."typing_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."event_logs" ADD CONSTRAINT "event_logs_lesson_attempt_id_fkey" FOREIGN KEY ("lesson_attempt_id") REFERENCES "app"."lesson_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
