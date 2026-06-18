# ПечатьПро — Тренажёр скорости печати

Тренажёр слепой печати на русском языке с авторизацией, историей сессий и админ-панелью.

## 🌐 Продакшен

- **Frontend**: https://typing-trainer-phi.vercel.app
- **Backend**: https://typing-trainer-production.up.railway.app

## 🛠 Технологический стек

| Слой | Технологии |
|------|------------|
| Frontend | Next.js 16 (App Router), TypeScript, TailwindCSS |
| Backend | NestJS, Prisma ORM v5, PostgreSQL |
| База данных | Supabase (PostgreSQL) |
| Деплой Frontend | Vercel |
| Деплой Backend | Railway |
| Email | Resend |

## 📁 Структура проекта

```
typing-trainer/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── auth/         # Регистрация, вход, верификация email
│   │   │   ├── sessions/     # Сессии печати (guest/learning)
│   │   │   ├── users/        # Профиль и статистика пользователя
│   │   │   ├── content/      # Тексты для тренажёра (CRUD)
│   │   │   └── prisma/       # Prisma сервис
│   │   └── prisma/
│   │       └── schema.prisma # Схема БД (схема app)
│   └── frontend/         # Next.js приложение
│       └── app/
│           ├── page.tsx          # Landing page
│           ├── login/            # Вход
│           ├── register/         # Регистрация
│           ├── verify-email/     # Подтверждение email
│           ├── dashboard/        # Личный кабинет
│           ├── typing-test/      # Тест скорости (guest)
│           ├── admin/texts/      # Админ-панель текстов
│           └── lib/
│               ├── api.ts            # Axios клиент
│               └── typing-engine.ts  # Движок печати
└── README.md
```

## 🗄 База данных

PostgreSQL на Supabase, схема `app`. Таблицы:

- `users` — пользователи
- `typing_sessions` — сессии печати
- `keystroke_events` — события нажатий клавиш (immutable)
- `lesson_attempts` — попытки прохождения уроков
- `certificates` — сертификаты
- `achievements` — достижения
- `subscriptions` — подписки
- `event_logs` — канонические события (append-only)
- `languages` — языки контента
- `typing_texts` — тексты для тренажёра

## 🔌 API эндпоинты

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`

### Sessions
- `POST /sessions` — создать сессию (guest или learning)
- `POST /sessions/:id/complete` — завершить сессию
- `GET /sessions` — история сессий

### Users
- `GET /users/me` — данные пользователя
- `GET /users/me/stats` — статистика

### Content
- `GET /texts` — список текстов
- `GET /texts/random` — случайный текст
- `GET /texts/admin` — все тексты (admin)
- `POST /texts/admin` — создать текст (admin)
- `PATCH /texts/admin/:id` — обновить текст (admin)
- `DELETE /texts/admin/:id` — удалить текст (admin)

## 🚀 Локальный запуск

### Backend
```bash
cd apps/backend
npm install
npm run start:dev
# Запускается на http://localhost:3000
```

### Frontend
```bash
cd apps/frontend
npm install
npm run dev -- --port 3001
# Запускается на http://localhost:3001
```

### Переменные окружения Backend (.env)
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
RESEND_API_KEY=re_...
APP_URL=http://localhost:3001
```

### Переменные окружения Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## ✅ Что реализовано

- [x] Landing page
- [x] Регистрация с подтверждением email (Resend)
- [x] Вход / выход (JWT)
- [x] Тест скорости печати (guest mode)
- [x] Typing Engine (char-level Unicode, без keycodes)
- [x] Сохранение keystroke событий в БД
- [x] Dashboard с реальной статистикой
- [x] История последних 10 тренировок
- [x] Админ-панель для управления текстами
- [x] Деплой на Vercel + Railway

## 🔜 Что планируется

- [ ] Верификация домена в Resend (чтобы письма шли на реальный email)
- [ ] Курсы и уроки (learning mode)
- [ ] Страница профиля
- [ ] Аналитика (тренды CPM/accuracy)
- [ ] Сертификаты
- [ ] Адаптивная сложность

## 👤 Роли пользователей

- `user` — обычный пользователь
- `premium` — премиум (FUTURE)
- `admin` — доступ к `/admin/texts`

## 📋 Документация

Все спецификации проекта находятся в папке /docs:
- `PROJECT_VISION.md`
- `SYSTEM_ARCHITECTURE.md`
- `DATABASE_SPECIFICATION.md` (v1.2)
- `API_SPECIFICATION.md` (v1.2)
- `FRONTEND_SPECIFICATION.md`
- `COURSE_SPECIFICATION.md`
- `ADMIN_PANEL_SPECIFICATION.md`
- `ANALYTICS_SPECIFICATION.md`
- `DEVELOPMENT_RULES.md`
- `DEFINITION_OF_DONE.md`
