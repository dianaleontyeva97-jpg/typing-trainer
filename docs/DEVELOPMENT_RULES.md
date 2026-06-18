# DEVELOPMENT_RULES.md

## Version
DEVELOPMENT_RULES v1.0

Совместим с:
- PROJECT_VISION v1.0
- SYSTEM_ARCHITECTURE v1.0
- DATABASE_SPECIFICATION v1.2
- API_SPECIFICATION v1.2
- FRONTEND_SPECIFICATION v1.0
- COURSE_SPECIFICATION v1.0
- ADMIN_PANEL_SPECIFICATION v1.0
- ANALYTICS_SPECIFICATION v1.0

---

# 1. Общие положения

Документ определяет правила разработки, которым обязаны следовать как
человек-разработчик, так и AI-агенты, работающие над проектом на основе
спецификаций 1–8.

## Иерархия документов
При конфликте требований приоритет имеют документы в следующем порядке:
1. PROJECT_VISION.md
2. SYSTEM_ARCHITECTURE.md
3. DATABASE_SPECIFICATION.md
4. API_SPECIFICATION.md
5. FRONTEND_SPECIFICATION.md / COURSE_SPECIFICATION.md /
   ADMIN_PANEL_SPECIFICATION.md / ANALYTICS_SPECIFICATION.md (равный
   приоритет в своих доменах)

Любое изменение, противоречащее документу более высокого приоритета,
MUST сопровождаться обновлением этого документа (увеличение версии) до
реализации.

---

# 2. Технологический стек (фиксация)

| Слой | Технологии |
|---|---|
| Frontend | Next.js (App Router), TypeScript (strict), TailwindCSS, shadcn/ui |
| Backend | NestJS, Prisma ORM, PostgreSQL |
| CMS | Directus |
| Analytics | внутренний event-driven модуль (часть Backend) |

Изменение стека требует обновления PROJECT_VISION и
SYSTEM_ARCHITECTURE.

---

# 3. Архитектурные правила (обязательные)

## 3.1 Data Flow Compliance
Любая реализация MUST соответствовать нормативному потоку данных
(SYSTEM_ARCHITECTURE):
```
User Input → Typing Engine → Session Layer → Backend API →
Keystroke Storage → Analytics Layer → Adaptive Learning Layer
```
Новые компоненты интегрируются без нарушения этого порядка.

## 3.2 Источники истины
- `KeystrokeEvent` и `EventLog` — первичные данные, immutable,
  append-only.
- Любые агрегаты/метрики — производные, пересчитываемые
  (см. ANALYTICS_SPECIFICATION, Reproducibility).
- Directus — источник истины только для контента (курсы, уроки,
  тексты, языки, категории, сложность). Никогда — для пользовательских
  данных.

## 3.3 Char-level Typing Engine
Реализация Typing Engine MUST:
- использовать char-level и Unicode comparison;
- НЕ использовать keycodes и physical keyboard mapping.

Любой PR, добавляющий зависимость от раскладки клавиатуры или
keycode-based логику в Typing Engine, MUST быть отклонён на ревью.

## 3.4 Изоляция слоёв
- Frontend не обращается к Directus напрямую (FRONTEND_SPECIFICATION,
  6.1; COURSE_SPECIFICATION, 8.1);
- CMS (Directus) не имеет доступа на запись к таблицам пользовательских
  данных (ADMIN_PANEL_SPECIFICATION, раздел 7).

---

# 4. Стандарты кода

## 4.1 TypeScript
- `strict: true` во всех `tsconfig.json` (frontend и backend);
- запрет `any` без явного обоснования в комментарии (`// eslint-disable-line`
  с пояснением);
- типы доменных сущностей (`User`, `TypingSession`, `KeystrokeEvent`,
  `TypingText`, `Course`, `Lesson`, `LessonAttempt`, `Certificate`,
  `Achievement`, `Subscription`, `Language`) MUST быть выведены из
  единого источника (Prisma schema → генерация типов / shared package),
  во избежание расхождений между Backend и Frontend.

## 4.2 Линтинг и форматирование
- ESLint + Prettier обязательны для всех TS/JS-файлов;
- запуск линтера MUST быть частью CI (раздел 6).

## 4.3 Naming Conventions
- сущности БД и API — `snake_case` для полей (соответствует
  DATABASE_SPECIFICATION: `session_id`, `text_id`,
  `reaction_time_ms` и т.д.);
- TypeScript-типы/интерфейсы — `PascalCase`;
- переменные/функции — `camelCase`.

## 4.4 Миграции БД
- любые изменения схемы PostgreSQL выполняются через Prisma Migrate;
- ручное изменение схемы продакшен-БД ЗАПРЕЩЕНО;
- миграции, нарушающие правило immutability `KeystrokeEvent` (например,
  добавление `UPDATE`/`DELETE` операций над этой таблицей в коде
  приложения), MUST быть отклонены на ревью.

---

# 5. Безопасность

## 5.1 Аутентификация
- пароли хранятся только как `password_hash` (см.
  DATABASE_SPECIFICATION, User.fields) — bcrypt/argon2, не реверсивные
  алгоритмы;
- access_token и refresh_token — JWT либо аналог, с раздельным TTL;
- `POST /auth/logout` MUST инвалидировать оба токена
  (API_SPECIFICATION, Logout Behavior) — реализация должна
  предусматривать механизм инвалидации (например, denylist/версионирование
  токенов), так как stateless JWT не инвалидируются сами по себе.

## 5.2 Авторизация
- ролевая модель `user / premium / admin` (PROJECT_VISION, 13) MUST
  проверяться на уровне Backend (guard/middleware NestJS), а не только
  на Frontend;
- `learning`-сессии MUST быть недоступны без валидного access_token
  (API_SPECIFICATION, Critical Rule).

## 5.3 Секреты и конфигурация
- секреты (DB credentials, JWT secrets, Directus tokens) хранятся в
  переменных окружения, не в репозитории;
- `.env.example` обязателен и поддерживается в актуальном состоянии.

## 5.4 Rate Limiting
- эндпоинты аутентификации (`/auth/*`, `POST /sessions` с
  `session_type=guest`) SHOULD быть защищены rate limiting для
  предотвращения abuse.

---

# 6. Тестирование

## 6.1 Обязательные уровни тестирования (MUST)
- unit-тесты для Typing Engine (сравнение символов, нормализация,
  расчёт CPM/accuracy) — на frontend и backend, так как оба слоя
  выполняют расчёт (PROJECT_VISION, 5: "Первичный расчет — frontend,
  Подтверждающий расчет — backend");
- unit-тесты для расчёта производных метрик (ANALYTICS_SPECIFICATION,
  раздел 3) с проверкой Reproducibility (расчёт из raw-данных даёт тот
  же результат, что и сохранённый агрегат);
- интеграционные тесты для критических API-правил:
  - guest-сессия не создаёт пользовательский прогресс;
  - learning-сессия требует авторизации;
  - logout инвалидирует access_token и refresh_token;
  - все list-эндпоинты поддерживают `page`/`limit`.

## 6.2 CI Pipeline (MUST)
CI MUST включать:
1. lint (ESLint);
2. typecheck (`tsc --noEmit`);
3. unit-тесты;
4. интеграционные тесты (минимум для auth/sessions).

PR не может быть смержен при провале любого из этапов.

---

# 7. Git Workflow

## 7.1 Ветки
- `main` — стабильная ветка, защищена от прямых push;
- `feature/*`, `fix/*` — рабочие ветки от `main`.

## 7.2 Commit messages
- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
  `chore:`).

## 7.3 Pull Request
- PR должен ссылаться на соответствующий раздел спецификации
  (например, "Implements API_SPECIFICATION → Session API → guest");
- PR с изменениями, затрагивающими доменную модель (DATABASE_SPECIFICATION),
  MUST включать обновление Prisma schema и миграции в одном PR.

---

# 8. Правила для AI-агентов

## 8.1 Контекст перед реализацией
Перед реализацией любой задачи AI-агент MUST:
1. определить, к какому документу спецификации относится задача;
2. проверить отсутствие конфликтов с документами более высокого
   приоритета (раздел 1);
3. при обнаружении неоднозначности — явно зафиксировать допущение в
   PR/комментарии, а не "додумывать" архитектурное решение молча.

## 8.2 Запрещённые действия без явного запроса
- изменение версии и содержания уже "готовых" документов
  (PROJECT_VISION, SYSTEM_ARCHITECTURE, DATABASE_SPECIFICATION,
  API_SPECIFICATION) без явного указания пользователя;
- изменение канонической семантики событий `EventLog`
  (ANALYTICS_SPECIFICATION, 2.3);
- введение мутируемости для `KeystrokeEvent`/`EventLog`.

## 8.3 Изменение архитектуры
Любое предложение об изменении технологического стека, доменной
модели или нормативного потока данных MUST быть представлено как
явное предложение (с указанием затрагиваемых документов) и не
применяться "по ходу" реализации другой задачи.

---

# 9. Acceptance Criteria

Документ считается готовым, если:
- зафиксирована иерархия приоритета спецификационных документов;
- зафиксирован технологический стек без отклонений от PROJECT_VISION;
- определены архитектурные правила, обеспечивающие соответствие
  SYSTEM_ARCHITECTURE (data flow, источники истины, изоляция CMS);
- определены стандарты кода, naming conventions и правила миграций;
- определены требования безопасности, согласованные с
  API_SPECIFICATION (logout invalidation, guest/learning разделение);
- определены обязательные уровни тестирования и CI pipeline;
- определён git workflow;
- определены правила работы AI-агентов, исключающие неконтролируемые
  изменения уже готовых спецификаций;
- документ совместим со всеми ранее определёнными спецификациями.
