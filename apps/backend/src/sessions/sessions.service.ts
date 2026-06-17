import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto, SessionTypeEnum } from './dto/create-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  // ─── Создание сессии ──────────────────────────────────────

  async createSession(dto: CreateSessionDto, userId?: string) {
    // Critical Rule: learning сессия требует авторизации
    if (dto.session_type === SessionTypeEnum.LEARNING && !userId) {
      throw new ForbiddenException(
        'Learning session требует авторизации',
      );
    }

    if (dto.session_type === SessionTypeEnum.LEARNING && !dto.lesson_id) {
      throw new BadRequestException(
        'lesson_id обязателен для learning сессии',
      );
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

    // Записываем событие start_session
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

  // ─── Завершение сессии ────────────────────────────────────

  async completeSession(
    sessionId: string,
    dto: CompleteSessionDto,
    userId?: string,
  ) {
    const session = await this.prisma.typingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Сессия не найдена');

    if (session.status === 'completed') {
      throw new BadRequestException('Сессия уже завершена');
    }

    if (
      session.sessionType === 'learning' &&
      session.userId !== userId
    ) {
      throw new ForbiddenException('Нет доступа к этой сессии');
    }

    // Сохраняем keystroke события
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

    // Рассчитываем финальные метрики
    const { cpm, accuracy } = this.calculateMetrics(dto);

    const endedAt = new Date();
    const durationMs =
      endedAt.getTime() - session.startedAt.getTime();

    // Обновляем сессию
    await this.prisma.typingSession.update({
      where: { id: sessionId },
      data: { status: 'completed', endedAt, cpm, accuracy },
    });

    // Записываем событие end_session
    await this.prisma.eventLog.create({
      data: {
        eventType: 'end_session',
        userId: userId || null,
        sessionId,
        payloadJson: { session_id: sessionId, cpm, accuracy, duration_ms: durationMs },
      },
    });

    // Создаём LessonAttempt для learning сессий
    let lessonAttempt: { id: string; is_passed: boolean; cpm: number; accuracy: number } | null = null;
    if (session.sessionType === 'learning' && session.lessonId && userId) {
      lessonAttempt = await this.createLessonAttempt(
        session,
        userId,
        cpm,
        accuracy,
        sessionId,
      );
    }

    return {
      session_id: sessionId,
      cpm,
      accuracy,
      lesson_attempt: lessonAttempt,
    };
  }

  // ─── История сессий ───────────────────────────────────────

  async getSessions(userId: string, page: number, limit: number) {
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

  // ─── Вспомогательные методы ───────────────────────────────

  private calculateMetrics(dto: CompleteSessionDto) {
    const events = dto.keystroke_events;
    if (events.length === 0) return { cpm: 0, accuracy: 0 };

    const correctChars = events.filter((e) => e.is_correct).length;
    const totalChars = events.length;

    // CPM = правильные символы / время в минутах
    const firstTimestamp = new Date(events[0].timestamp).getTime();
    const lastTimestamp = new Date(
      events[events.length - 1].timestamp,
    ).getTime();
    const durationMs = lastTimestamp - firstTimestamp || 1;
    const durationMin = durationMs / 60000;

    const cpm = Math.round(correctChars / durationMin);
    const accuracy = Math.round((correctChars / totalChars) * 100) / 100;

    return { cpm, accuracy };
  }

  private async createLessonAttempt(
    session: any,
    userId: string,
    cpm: number,
    accuracy: number,
    sessionId: string,
  ) {
    // Для MVP isPassed = cpm >= 30 AND accuracy >= 0.7
    // В будущем target_cpm и target_accuracy берутся из content.Lesson
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

    // Записываем событие lesson_completed
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
}