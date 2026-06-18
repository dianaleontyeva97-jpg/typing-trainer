import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getMe(userId: string): Promise<{
        email: string;
        nickname: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        createdAt: Date;
    }>;
    getStats(userId: string): Promise<{
        total_sessions: number;
        avg_cpm: number;
        avg_accuracy: number;
        recent_sessions: {
            id: string;
            sessionType: import(".prisma/client").$Enums.SessionType;
            startedAt: Date;
            cpm: number | null;
            accuracy: number | null;
        }[];
    }>;
}
