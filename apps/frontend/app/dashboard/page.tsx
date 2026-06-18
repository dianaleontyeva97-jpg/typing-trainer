'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../lib/api';

interface UserStats {
  total_sessions: number;
  avg_cpm: number;
  avg_accuracy: number;
  recent_sessions: {
    id: string;
    cpm: number;
    accuracy: number;
    startedAt: string;
    sessionType: string;
  }[];
}

interface User {
  email: string;
  nickname: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    Promise.all([
      api.get('/users/me'),
      api.get('/users/me/stats'),
    ])
      .then(([userRes, statsRes]) => {
        setUser(userRes.data);
        setStats(statsRes.data);
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Навигация */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          ПечатьПро
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user?.nickname || user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Выйти
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">
          Добро пожаловать, {user?.nickname}! 👋
        </h2>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-1">
              {stats?.avg_cpm || 0}
            </div>
            <div className="text-sm text-gray-500">средний CPM</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {stats?.avg_accuracy || 0}%
            </div>
            <div className="text-sm text-gray-500">средняя точность</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-3xl font-bold text-gray-700 mb-1">
              {stats?.total_sessions || 0}
            </div>
            <div className="text-sm text-gray-500">всего сессий</div>
          </div>
        </div>

        {/* Быстрые действия */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <Link
            href="/typing-test"
            className="bg-indigo-600 text-white rounded-xl p-6 hover:bg-indigo-700 transition"
          >
            <div className="text-2xl mb-2">⌨️</div>
            <div className="font-semibold text-lg">Тест скорости</div>
            <div className="text-indigo-200 text-sm mt-1">
              Проверьте скорость прямо сейчас
            </div>
          </Link>
          <div className="bg-white rounded-xl p-6 shadow-sm opacity-60">
            <div className="text-2xl mb-2">📚</div>
            <div className="font-semibold text-lg text-gray-800">Курсы</div>
            <div className="text-gray-400 text-sm mt-1">Скоро</div>
          </div>
        </div>

        {/* История сессий */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Последние тренировки
          </h3>
          {stats?.recent_sessions && stats.recent_sessions.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg">⌨️</div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {session.sessionType === 'guest'
                          ? 'Тест скорости'
                          : 'Урок'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(session.startedAt).toLocaleDateString(
                          'ru-RU',
                          {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-indigo-600">
                        {session.cpm} CPM
                      </div>
                      <div className="text-xs text-gray-400">
                        {Math.round((session.accuracy || 0) * 100)}% точность
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">⌨️</div>
              <p>Нет тренировок. Начните первую прямо сейчас!</p>
              <Link
                href="/typing-test"
                className="inline-block mt-4 text-indigo-600 hover:underline text-sm"
              >
                Начать тест →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}