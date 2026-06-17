import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';
export declare class SessionsService {
    private prisma;
    constructor(prisma: PrismaService);
    createSession(dto: CreateSessionDto, userId?: string): Promise<{
        id: string;
        session_type: import(".prisma/client").$Enums.SessionType;
        text_id: string;
        lesson_id: string | null;
        started_at: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
    }>;
    completeSession(sessionId: string, dto: CompleteSessionDto, userId?: string): Promise<{
        session_id: string;
        cpm: number;
        accuracy: number;
        lesson_attempt: {
            id: string;
            is_passed: boolean;
            cpm: number;
            accuracy: number;
        } | null;
    }>;
    getSessions(userId: string, page: number, limit: number): Promise<{
        data: {
            id: string;
            sessionType: import(".prisma/client").$Enums.SessionType;
            status: import(".prisma/client").$Enums.SessionStatus;
            textId: string;
            lessonId: string | null;
            startedAt: Date;
            endedAt: Date | null;
            cpm: number | null;
            accuracy: number | null;
            userId: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    private calculateMetrics;
    private createLessonAttempt;
}
