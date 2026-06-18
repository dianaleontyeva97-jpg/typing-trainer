# FRONTEND_SPECIFICATION.md

## Version
FRONTEND_SPECIFICATION v1.0

Совместим с:
- PROJECT_VISION v1.0
- SYSTEM_ARCHITECTURE v1.0
- API_SPECIFICATION v1.2
- DATABASE_SPECIFICATION v1.2

---

# 1. Общие положения

Документ определяет архитектуру фронтенд-приложения тренажёра скорости печати.

Frontend является клиентским слоем системы и **не является источником истины**
для пользовательских данных (см. PROJECT_VISION, 4.1).

## Технологический стек
MUST
- Next.js (App Router)
- TypeScript (strict mode)
- TailwindCSS
- shadcn/ui

## Ответственность Frontend
- отображение интерфейса;
- работа Typing Engine на клиенте;
- сбор пользовательского ввода (Unicode-символы);
- локальный (предварительный) расчёт CPM и accuracy;
- отображение аналитики и прогресса;
- маршрутизация между guest-режимом и learning-режимом;
- работа с Backend API через HTTP/REST.

Frontend не хранит и не подтверждает финальные значения метрик —
финальные значения подтверждает Backend (см. PROJECT_VISION, 5).

---

# 2. Архитектура приложения

## 2.1 Тип приложения
Многостраничное приложение (multi-page application) на базе Next.js App Router.
MVP (soft-daffodil-4c33eb.netlify.app) рассматривается как прототип Typing Engine
и переносится в проект как изолированный модуль `TypingEngine`.

## 2.2 Группы маршрутов

### Public Group (без авторизации)
- `/` — landing page
- `/typing-test` — Public Typing Test (guest session)
- `/login`
- `/register`
- `/verify-email`
- `/resend-verification`
- `/forgot-password`, `/reset-password` (FUTURE, см. раздел 9)

### Authenticated Group (Learning Mode)
- `/dashboard` — обзор прогресса пользователя
- `/courses` — каталог курсов
- `/courses/[courseId]` — описание курса, список уроков
- `/courses/[courseId]/lessons/[lessonId]` — тренажёр урока (learning session)
- `/history` — история сессий (GET /sessions)
- `/lesson-attempts` — история попыток (GET /lesson-attempts)
- `/lesson-attempts/[id]` — детали попытки
- `/certificates` — список сертификатов пользователя
- `/profile` — профиль и настройки аккаунта
- `/logout` — обработчик выхода (POST /auth/logout)

## 2.3 Architectural Rule
Маршруты Authenticated Group MUST быть защищены middleware-проверкой
наличия валидного access_token.
Попытка создания `learning`-сессии без авторизации MUST блокироваться
на уровне Frontend до отправки запроса (см. API_SPECIFICATION,
"Critical Rule: Learning session НЕ может быть создан анонимно").

---

# 3. Typing Engine (Frontend Module)

## 3.1 Назначение
Центральный модуль ввода и сравнения текста. Общий для guest- и
learning-режимов.

## 3.2 Обязательные требования (MUST)
- работа исключительно на уровне символов (char-level comparison);
- Unicode comparison;
- НЕ используются keycodes;
- НЕ используется physical keyboard mapping;
- результат сравнения не зависит от раскладки клавиатуры.

## 3.3 Нормализация ввода
Перед сравнением Typing Engine MUST выполнять:
- Unicode normalization (NFC);
- нормализацию пробелов;
- нормализацию переносов строк (`\r\n` → `\n`).

## 3.4 Локальные метрики (предварительные)
Frontend рассчитывает в реальном времени:
- промежуточный CPM;
- промежуточную accuracy = correct_characters / total_typed_characters;
- позицию курсора;
- статус каждого символа: `correct | incorrect | pending`.

Эти значения являются **предварительными** и отображаются пользователю
во время сессии. Финальные значения подтверждаются Backend после
завершения сессии (см. PROJECT_VISION, 5).

## 3.5 Keystroke Event Capture
Для каждого введённого символа Typing Engine формирует объект:
- `text_id`
- `position_index`
- `expected_char`
- `typed_char`
- `timestamp`
- `reaction_time_ms`
- `is_correct`

События накапливаются локально в рамках сессии и передаются на Backend
батчами при завершении сессии (или периодически — конкретный механизм
определяется на уровне реализации Session Layer).

## 3.6 Independence Rule
Typing Engine MUST быть реализован как независимый модуль без прямой
зависимости от Next.js routing, чтобы он мог использоваться и в
guest-режиме (`/typing-test`), и в learning-режиме
(`/courses/[courseId]/lessons/[lessonId]`).

---

# 4. Управление сессиями (Session Layer на фронтенде)

## 4.1 Guest Session
- инициируется на странице `/typing-test`;
- вызывает `POST /sessions` с `session_type = "guest"`;
- не требует авторизации;
- результаты не сохраняются в персональный прогресс пользователя;
- данные допускается хранить только в памяти браузера или временной
  backend-сессии (см. PROJECT_VISION, 6.1).

## 4.2 Learning Session
- инициируется со страницы урока;
- вызывает `POST /sessions` с `session_type = "learning"`, обязательным
  `text_id` и привязкой к авторизованному пользователю;
- требует валидного access_token;
- результаты сохраняются как `LessonAttempt` и `KeystrokeEvent`.

## 4.3 Завершение сессии
При завершении сессии Frontend MUST:
1. отправить накопленные keystroke-события на Backend;
2. дождаться подтверждённых (final) значений CPM/accuracy;
3. отобразить пользователю финальный результат, полученный от Backend,
   а не локально рассчитанный.

---

# 5. Аутентификация на фронтенде

## 5.1 Поток регистрации
1. `/register` → создание аккаунта;
2. отображение состояния "ожидание подтверждения email";
3. `/verify-email?token=...` → `POST /auth/verify-email`;
4. при необходимости — `POST /auth/resend-verification`
   (требует авторизации согласно API_SPECIFICATION).

## 5.2 Хранение токенов
- access_token и refresh_token обрабатываются согласно общей модели
  аутентификации Backend API.
- Frontend MUST инвалидировать локальное состояние авторизации сразу
  после успешного `POST /auth/logout`, независимо от ответа сервера.

## 5.3 Logout Rule
После вызова `POST /auth/logout`:
- access_token и refresh_token считаются недействительными
  (см. API_SPECIFICATION, "Logout Behavior");
- Frontend MUST очистить локальное хранилище токенов и перенаправить
  пользователя на `/` или `/login`.

## 5.4 Защита маршрутов
- middleware/layout Authenticated Group MUST проверять наличие
  валидного access_token перед рендером;
- при отсутствии/недействительности токена — редирект на `/login` с
  сохранением исходного маршрута для возврата после входа.

---

# 6. Управление данными и API-слой

## 6.1 Принципы
- Все запросы к Backend выполняются через единый API-клиент
  (типизированный, на основе сгенерированных типов из
  API_SPECIFICATION/Prisma-схемы).
- Frontend не выполняет прямых запросов к Directus CMS — контент
  курсов/текстов получается через Backend API (Backend выступает
  посредником, см. SYSTEM_ARCHITECTURE, CMS Content Integration Module).

## 6.2 Pagination
Все списковые страницы (`/history`, `/lesson-attempts`, `/courses`,
`/certificates`) MUST использовать query-параметры `page` и `limit` в
соответствии с Pagination Rule (API_SPECIFICATION, Global).

## 6.3 Кэширование и ревалидация
- данные каталога курсов/текстов (источник — Directus) допускают
  кэширование на стороне Frontend (ISR/кэш Next.js);
- пользовательские данные (прогресс, сессии, сертификаты) MUST
  запрашиваться без долгосрочного кэширования (always fresh / no-store).

---

# 7. Компонентная архитектура

## 7.1 Базовые модули
- `TypingEngine` — модуль ввода и сравнения текста (раздел 3);
- `SessionRunner` — управление жизненным циклом сессии (старт/стоп,
  сбор keystroke-событий, отправка на Backend);
- `MetricsPanel` — отображение CPM/accuracy (live + final);
- `AuthGuard` — проверка авторизации для защищённых маршрутов;
- `Pagination` — переиспользуемый компонент для списковых страниц;
- `CertificateViewer` — отображение/скачивание PDF-сертификата;
- `LanguageSwitcher` — переключение языка интерфейса и контента.

## 7.2 UI-библиотека
Все интерактивные элементы UI (кнопки, формы, модальные окна, таблицы)
строятся на основе компонентов shadcn/ui с использованием токенов
TailwindCSS.

---

# 8. Мультиязычность (i18n)

В соответствии с PROJECT_VISION, раздел 10:

| Язык | Статус |
|------|--------|
| RU   | MUST   |
| EN   | SHOULD |
| BY, UA | FUTURE |

## Architectural Rule
- интерфейс приложения MUST быть спроектирован с поддержкой
  мультиязычности с первого релиза (i18n-инфраструктура обязательна,
  даже если переводы для EN/BY/UA отсутствуют на момент MVP);
- язык контента (текстов для печати) определяется отдельно от языка
  интерфейса и приходит из Directus CMS как атрибут `TypingText`/`Course`.

---

# 9. Обработка ошибок и состояний

## 9.1 Обязательные UI-состояния для каждой страницы с данными
- `loading`
- `error` (включая отдельную обработку 401 — истёкший access_token)
- `empty` (пустой список/нет данных)
- `success`

## 9.2 Обработка истечения токена
При получении 401 от Backend во время работы в Authenticated Group:
- Frontend MUST попытаться выполнить refresh (если предусмотрен flow
  обновления токена на уровне Backend);
- при невозможности — выполнить логику, аналогичную `/logout`, и
  перенаправить на `/login`.

## 9.3 Guest Mode и сетевые ошибки
Поскольку guest-сессия может быть stateless, Frontend MUST обеспечивать
деградацию: при недоступности Backend Public Typing Test может работать
полностью на клиенте (текст для печати — из локального fallback-набора
или из последнего успешно загруженного набора).

---

# 10. Адаптивность и доступность

- интерфейс MUST быть адаптивным (mobile / tablet / desktop);
- Typing Engine SHOULD корректно обрабатывать виртуальную клавиатуру на
  мобильных устройствах, не нарушая правило "не зависит от раскладки
  клавиатуры" (PROJECT_VISION, 7);
- интерактивные элементы MUST соответствовать базовым требованиям
  доступности (фокус, контраст, ARIA-атрибуты для интерактивных
  компонентов shadcn/ui).

---

# 11. Acceptance Criteria

Документ считается готовым, если:
- определена карта страниц для guest- и learning-режимов;
- Typing Engine описан как независимый модуль с char-level/Unicode
  сравнением без keycodes и привязки к раскладке;
- определена модель keystroke-событий, совместимая с
  DATABASE_SPECIFICATION (KeystrokeEvent);
- определены правила различия guest и learning сессий, совместимые с
  API_SPECIFICATION (Session API);
- определены правила аутентификации, защиты маршрутов и logout-инвалидации;
- определены правила pagination для списковых страниц;
- определена модель мультиязычности (RU MUST, EN SHOULD, FUTURE);
- определены обязательные UI-состояния (loading/error/empty/success);
- документ совместим с PROJECT_VISION v1.0, SYSTEM_ARCHITECTURE v1.0,
  API_SPECIFICATION v1.2 и DATABASE_SPECIFICATION v1.2.
