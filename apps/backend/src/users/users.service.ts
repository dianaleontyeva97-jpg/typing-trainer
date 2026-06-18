import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async getStats(userId: string) {
    const [totalSessions, recentSessions] = await this.prisma.$transaction([
      this.prisma.typingSession.count({
        where: { userId, status: 'completed' },
      }),
      this.prisma.typingSession.findMany({
        where: { userId, status: 'completed' },
        orderBy: { startedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          cpm: true,
          accuracy: true,
          startedAt: true,
          sessionType: true,
        },
      }),
    ]);

    // Средний CPM за последние 10 сессий
    const avgCpm =
      recentSessions.length > 0
        ? Math.round(
            recentSessions.reduce((sum, s) => sum + (s.cpm || 0), 0) /
              recentSessions.length,
          )
        : 0;

    // Средняя точность за последние 10 сессий
    const avgAccuracy =
      recentSessions.length > 0
        ? Math.round(
            (recentSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) /
              recentSessions.length) *
              100,
          )
        : 0;

    return {
      total_sessions: totalSessions,
      avg_cpm: avgCpm,
      avg_accuracy: avgAccuracy,
      recent_sessions: recentSessions,
    };
  }
}