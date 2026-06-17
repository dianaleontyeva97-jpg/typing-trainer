'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Навигация */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <div className="text-xl font-bold text-indigo-600">
          ПечатьПро
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/typing-test"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Тест скорости
          </Link>
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Начать бесплатно
          </Link>
        </div>
      </nav>

      {/* Герой */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-indigo-50 text-indigo-600 text-sm font-medium px-4 py-1 rounded-full mb-6">
          Тренажёр слепой печати на русском языке
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Печатай быстрее.<br />
          <span className="text-indigo-600">Думай свободнее.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Научитесь печатать вслепую с помощью структурированных курсов
          и ежедневных тренировок. Отслеживайте прогресс и получайте сертификаты.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/typing-test"
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium text-lg hover:bg-indigo-700 transition"
          >
            Попробовать бесплатно
          </Link>
          <Link
            href="/register"
            className="text-gray-600 px-8 py-3 rounded-xl font-medium text-lg border border-gray-200 hover:border-gray-300 transition"
          >
            Создать аккаунт
          </Link>
        </div>
      </section>

      {/* Демо тренажёра */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-sm text-gray-400 ml-2">тренажёр</span>
          </div>
          <div className="font-mono text-xl text-gray-800 leading-relaxed">
            <span className="text-gray-400">Быстрая </span>
            <span className="text-gray-400">коричневая </span>
            <span className="border-b-2 border-indigo-500 text-gray-800">л</span>
            <span className="text-gray-800">иса прыгает через</span>
            <span className="text-gray-800"> ленивую собаку.</span>
          </div>
          <div className="flex gap-6 mt-6 pt-6 border-t border-gray-200">
            <div>
              <div className="text-2xl font-bold text-indigo-600">248</div>
              <div className="text-xs text-gray-500">симв/мин</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">98%</div>
              <div className="text-xs text-gray-500">точность</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">12/53</div>
              <div className="text-xs text-gray-500">символов</div>
            </div>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Почему ПечатьПро?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-4">🇷🇺</div>
              <h3 className="font-semibold text-gray-800 mb-2">
                Русский язык
              </h3>
              <p className="text-gray-500 text-sm">
                Тексты на русском языке разных жанров — от художественной
                литературы до научно-популярных статей.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="font-semibold text-gray-800 mb-2">
                Отслеживание прогресса
              </h3>
              <p className="text-gray-500 text-sm">
                Видите динамику скорости и точности, историю тренировок
                и статистику ошибок по символам.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-4">🎓</div>
              <h3 className="font-semibold text-gray-800 mb-2">
                Сертификаты
              </h3>
              <p className="text-gray-500 text-sm">
                Завершайте курсы и получайте сертификаты,
                подтверждающие ваш уровень владения клавиатурой.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Начните прямо сейчас
          </h2>
          <p className="text-gray-500 mb-8">
            Бесплатно. Без установки. Просто откройте и начните печатать.
          </p>
          <Link
            href="/typing-test"
            className="inline-block bg-indigo-600 text-white px-10 py-4 rounded-xl font-medium text-lg hover:bg-indigo-700 transition"
          >
            Начать тест →
          </Link>
        </div>
      </section>

      {/* Футер */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <div className="text-sm font-bold text-indigo-600">ПечатьПро</div>
          <div className="text-sm text-gray-400">
            © 2026 ПечатьПро. Все права защищены.
          </div>
        </div>
      </footer>

    </div>
  );
}