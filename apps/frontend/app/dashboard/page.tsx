'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; nickname: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    // Временно берём данные из токена
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ email: payload.email, nickname: payload.email });
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">
          Тренажёр печати
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Выйти
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Добро пожаловать! 👋
        </h2>
        <p className="text-gray-500 mb-8">
          Начните тренироваться прямо сейчас
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-3xl mb-3">⌨️</div>
            <h3 className="font-semibold text-gray-800 mb-1">Тест скорости</h3>
            <p className="text-sm text-gray-500 mb-4">
              Проверьте скорость печати без регистрации
            </p>
            <button className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
              Начать тест
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="font-semibold text-gray-800 mb-1">Курсы</h3>
            <p className="text-sm text-gray-500 mb-4">
              Обучайтесь по структурированным курсам
            </p>
            <button className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              Скоро
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-800 mb-1">Статистика</h3>
            <p className="text-sm text-gray-500 mb-4">
              Отслеживайте свой прогресс
            </p>
            <button className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              Скоро
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}