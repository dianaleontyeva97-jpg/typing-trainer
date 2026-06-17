"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const create_session_dto_1 = require("./dto/create-session.dto");
let SessionsService = class SessionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createSession(dto, userId) {
        if (dto.session_type === create_session_dto_1.SessionTypeEnum.LEARNING && !userId) {
            throw new common_1.ForbiddenException('Learning session требует авторизации');
        }
        if (dto.session_type === create_session_dto_1.SessionTypeEnum.LEARNING && !dto.lesson_id) {
            throw new common_1.BadRequestException('lesson_id обязателен для learning сессии');
        }
        const session = await this.prisma.typingSession.create({
            data: {
                userId: userId || null,
                sessionType: dto.session_type,
                textId: dto.text_id,
                lessonId: dto.lesson_id || null,
                status: 'active',
            },
        });
        await this.prisma.eventLog.create({
            data: {
                eventType: 'start_session',
                userId: userId || null,
                sessionId: session.id,
                payloadJson: {
                    session_id: session.id,
                    session_type: dto.session_type,
                    text_id: dto.text_id,
                },
            },
        });
        return {
            id: session.id,
            session_type: session.sessionType,
            text_id: session.textId,
            lesson_id: session.lessonId,
            started_at: session.startedAt,
            status: session.status,
        };
    }
    async completeSession(sessionId, dto, userId) {
        const session = await this.prisma.typingSession.findUnique({
            where: { id: sessionId },
        });
        if (!session)
            throw new common_1.NotFoundException('Сессия не найдена');
        if (session.status === 'completed') {
            throw new common_1.BadRequestException('Сессия уже завершена');
        }
        if (session.sessionType === 'learning' &&
            session.userId !== userId) {
            throw new common_1.ForbiddenException('Нет доступа к этой сессии');
        }
        if (dto.keystroke_events.length > 0) {
            await this.prisma.keystrokeEvent.createMany({
                data: dto.keystroke_events.map((k) => ({
                    sessionId,
                    textId: session.textId,
                    positionIndex: k.position_index,
                    expectedChar: k.expected_char,
                    typedChar: k.typed_char,
                    timestamp: new Date(k.timestamp),
                    reactionTimeMs: k.reaction_time_ms,
                    isCorrect: k.is_correct,
                })),
            });
        }
        const { cpm, accuracy } = this.calculateMetrics(dto);
        const endedAt = new Date();
        const durationMs = endedAt.getTime() - session.startedAt.getTime();
        await this.prisma.typingSession.update({
            where: { id: sessionId },
            data: { status: 'completed', endedAt, cpm, accuracy },
        });
        await this.prisma.eventLog.create({
            data: {
                eventType: 'end_session',
                userId: userId || null,
                sessionId,
                payloadJson: { session_id: sessionId, cpm, accuracy, duration_ms: durationMs },
            },
        });
        let lessonAttempt = null;
        if (session.sessionType === 'learning' && session.lessonId && userId) {
            lessonAttempt = await this.createLessonAttempt(session, userId, cpm, accuracy, sessionId);
        }
        return {
            session_id: sessionId,
            cpm,
            accuracy,
            lesson_attempt: lessonAttempt,
        };
    }
    async getSessions(userId, page, limit) {
        const skip = (page - 1) * limit;
        const [sessions, total] = await this.prisma.$transaction([
            this.prisma.typingSession.findMany({
                where: { userId },
                orderBy: { startedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.typingSession.count({ where: { userId } }),
        ]);
        return {
            data: sessions,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }
    calculateMetrics(dto) {
        const events = dto.keystroke_events;
        if (events.length === 0)
            return { cpm: 0, accuracy: 0 };
        const correctChars = events.filter((e) => e.is_correct).length;
        const totalChars = events.length;
        const firstTimestamp = new Date(events[0].timestamp).getTime();
        const lastTimestamp = new Date(events[events.length - 1].timestamp).getTime();
        const durationMs = lastTimestamp - firstTimestamp || 1;
        const durationMin = durationMs / 60000;
        const cpm = Math.round(correctChars / durationMin);
        const accuracy = Math.round((correctChars / totalChars) * 100) / 100;
        return { cpm, accuracy };
    }
    async createLessonAttempt(session, userId, cpm, accuracy, sessionId) {
        const isPassed = cpm >= 30 && accuracy >= 0.7;
        const attempt = await this.prisma.lessonAttempt.create({
            data: {
                userId,
                lessonId: session.lessonId,
                sessionId,
                cpm,
                accuracy,
                isPassed,
            },
        });
        await this.prisma.eventLog.create({
            data: {
                eventType: 'lesson_completed',
                userId,
                sessionId,
                lessonAttemptId: attempt.id,
                payloadJson: {
                    lesson_id: session.lessonId,
                    lesson_attempt_id: attempt.id,
                    is_passed: isPassed,
                    cpm,
                    accuracy,
                },
            },
        });
        return {
            id: attempt.id,
            is_passed: isPassed,
            cpm,
            accuracy,
        };
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map