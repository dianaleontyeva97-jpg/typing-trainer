# API_SPECIFICATION.md

## Version
API_SPECIFICATION v1.2

## Changelog (v1.1 → v1.2)
- добавлена Content API: `/languages`, `/courses`, `/courses/{id}`,
  `/courses/{id}/lessons`, `/lessons/{id}`, `/texts`, `/texts/{id}`
  (read-only, источник — `content`-схема / Directus, см.
  ADMIN_PANEL_SPECIFICATION v1.0, COURSE_SPECIFICATION v1.0);
- добавлена Certificates API: `/certificates`, `/certificates/{id}`;
- добавлена Achievements API: `/achievements`;
- добавлена Subscriptions API (read-only на v1.2): `/subscriptions/me`;
- добавлена Analytics API: `/analytics/me/summary`,
  `/analytics/me/trends`, `/analytics/me/error-stats`
  (см. ANALYTICS_SPECIFICATION v1.0);
- уточнён Session API: формализован ответ `POST /sessions` и
  `end_session`-флоу, добавлена связь `learning`-сессии с `lesson_id`;
- Pagination Rule (Global) дополнена новыми list-эндпоинтами;
- Acceptance Criteria дополнены условием совместимости с
  DATABASE_SPECIFICATION v1.2.

Совместим с:
- PROJECT_VISION v1.0
- SYSTEM_ARCHITECTURE v1.0
- DATABASE_SPECIFICATION v1.2
- FRONTEND_SPECIFICATION v1.0
- COURSE_SPECIFICATION v1.0
- ADMIN_PANEL_SPECIFICATION v1.0
- ANALYTICS_SPECIFICATION v1.0

---

# Email Verification API

## Verify Email
POST /auth/verify-email

### Request
- verification_token

### Response
- success

---

## Resend Email Verification
POST /auth/resend-verification

Authentication required.

### Response
- success

---

# Authentication Model (Update)

## Logout
POST /auth/logout

Authentication required.

### Rules
- access_token становится недействительным
- refresh_token становится недействительным

---

# Session API (Update)

## Create Session
POST /sessions

### Request
- text_id
- session_type
- lesson_id (required, если `session_type = "learning"`; soft
  reference → `content.Lesson`)

### session_type rules

#### guest
- Public endpoint
- Без авторизации
- Не создаёт пользовательский прогресс
- Поле `lesson_id` запрещено (игнорируется/отклоняется при наличии)

#### learning
- Authentication required
- Только для авторизованных пользователей
- Обязательно привязан к user_id
- Обязателен `lesson_id`

### Critical Rule
Learning session НЕ может быть создан анонимно.

### Response
- id
- session_type
- text_id
- lesson_id (nullable)
- started_at
- status (`active`)

---

## Complete Session
POST /sessions/{id}/complete

### Request
- keystroke_events (массив объектов `KeystrokeEvent`:
  `position_index`, `expected_char`, `typed_char`, `timestamp`,
  `reaction_time_ms`, `is_correct`)

### Rules
- доступен без авторизации для `guest`-сессий, с авторизацией — для
  `learning`-сессий, принадлежащих текущему пользователю;
- Backend пересчитывает `cpm` и `accuracy` из переданных
  `keystroke_events` (финальные значения, см.
  ANALYTICS_SPECIFICATION, 3.1–3.2);
- для `session_type = "learning"`: создаётся запись `LessonAttempt` с
  вычисленным `is_passed` (COURSE_SPECIFICATION, 3.1), записываются
  канонические события `end_session` и `lesson_completed` в
  `EventLog`;
- для `session_type = "guest"`: записывается каноническое событие
  `end_session` (с nullable `user_id`), `KeystrokeEvent` сохраняются
  опционально (см. PROJECT_VISION, 6.1 — допускается временная
  persistence).

### Response
- session_id
- cpm (final)
- accuracy (final)
- lesson_attempt (nullable — присутствует только для `learning`,
  включает `id`, `is_passed`)

### Architectural Rule
`KeystrokeEvent`, созданные данным эндпоинтом, immutable после записи
(DATABASE_SPECIFICATION, 5.4). Повторный вызов `complete` для уже
завершённой сессии MUST быть отклонён (409 Conflict).

---

## Session History
GET /sessions

Authentication required.

### Query Parameters
- page
- limit

### Response
- paginated list of user sessions

---

# Lesson Attempt API

## List Lesson Attempts
GET /lesson-attempts

Authentication required.

### Query Parameters
- page
- limit

---

## Get Lesson Attempt
GET /lesson-attempts/{id}

Authentication required.

---

# Content API (Read-Only)

Источник данных — `content`-схема (Directus), см.
ADMIN_PANEL_SPECIFICATION v1.0. Backend предоставляет данный API как
посредник (read-only proxy/cache) — Frontend не обращается к Directus
напрямую (FRONTEND_SPECIFICATION, 6.1).

Все эндпоинты этого раздела возвращают только записи со статусом
`published` (ADMIN_PANEL_SPECIFICATION, 5.2).

## List Languages
GET /languages

### Response
- list of: `id`, `code`, `name`

---

## List Courses
GET /courses

### Query Parameters
- page
- limit
- language (фильтр по `language.code`)

### Response
- paginated list of courses: `id`, `title`, `description`,
  `language_id`, `level`, `order`

---

## Get Course
GET /courses/{id}

### Response
- `id`, `title`, `description`, `language_id`, `level`, `order`,
  `certificate_config` (`min_cpm`, `min_accuracy`)

---

## List Course Lessons
GET /courses/{id}/lessons

### Query Parameters
- page
- limit

### Response
- paginated list of lessons: `id`, `course_id`, `title`, `order`,
  `text_id`, `target_cpm`, `target_accuracy`
- для авторизованного пользователя каждый элемент дополнительно
  содержит `is_unlocked` и `is_passed` (производные значения, см.
  COURSE_SPECIFICATION, 3.3 — вычисляются из `LessonAttempt`)

---

## Get Lesson
GET /lessons/{id}

### Response
- `id`, `course_id`, `title`, `order`, `text_id`, `target_cpm`,
  `target_accuracy`, `difficulty_tag`

---

## List Typing Texts
GET /texts

### Query Parameters
- page
- limit
- language (фильтр по `language.code`)
- category (`fiction` | `non_fiction`)

### Response
- paginated list of texts: `id`, `title`, `language_id`, `category`,
  `difficulty_level`, `length_chars`

### Notes
Используется для Public Typing Test (`/typing-test`) — выбор текста для
`guest`-сессии (PROJECT_VISION, 6.1).

---

## Get Typing Text
GET /texts/{id}

### Response
- `id`, `title`, `content`, `language_id`, `category`,
  `difficulty_level`, `length_chars`

---

# Certificates API

## List Certificates
GET /certificates

Authentication required.

### Query Parameters
- page
- limit

### Response
- paginated list: `id`, `course_id`, `issued_at`, `cpm_at_issue`,
  `accuracy_at_issue`, `file_url`

---

## Get Certificate
GET /certificates/{id}

Authentication required.

### Rules
- доступен только владельцу сертификата (`user_id` совпадает с текущим
  пользователем) либо `role = admin`.

### Response
- `id`, `course_id`, `issued_at`, `cpm_at_issue`, `accuracy_at_issue`,
  `file_url` (ссылка на PDF, COURSE_SPECIFICATION, 6.2)

---

# Achievements API

## List Achievements
GET /achievements

Authentication required.

### Query Parameters
- page
- limit

### Response
- paginated list: `id`, `achievement_type`, `unlocked_at`,
  `metadata_json`

---

# Subscriptions API

## Get Current Subscription
GET /subscriptions/me

Authentication required.

### Response
- `id`, `plan` (`free` | `premium`), `status`, `started_at`,
  `ended_at`

### Architectural Rule
В v1.2 API является read-only. Создание/изменение подписки
(`POST /subscriptions`, оплата, апгрейд/даунгрейд плана) — FUTURE,
вне рамок MVP (PROJECT_VISION, 13).

---

# Analytics API (Read-Only)

См. ANALYTICS_SPECIFICATION v1.0. Все эндпоинты — read-only, не
создают новых записей `EventLog`/`KeystrokeEvent`.

## Get Personal Summary
GET /analytics/me/summary

Authentication required.

### Response
- `current_cpm`
- `current_accuracy`
- `total_sessions`
- `total_lessons_completed`
- `learning_progress` (по активным курсам)

---

## Get Personal Trends
GET /analytics/me/trends

Authentication required.

### Query Parameters
- period (`day` | `week` | `month`)
- page
- limit

### Response
- paginated time series: `period_start`, `cpm`, `accuracy`

---

## Get Error Stats
GET /analytics/me/error-stats

Authentication required.

### Query Parameters
- page
- limit

### Response
- paginated list: `expected_char`, `typed_char`, `count`

---

# Pagination Rule (Global)

Все list endpoints должны поддерживать:

### Query Parameters
- page
- limit

### Applies To
- /courses
- /courses/{id}/lessons
- /texts
- /sessions
- /certificates
- /lesson-attempts
- /achievements
- /analytics/me/trends
- /analytics/me/error-stats

---

# API Constraints

## Logout Behavior
Logout инвалидирует:
- access_token
- refresh_token

---

## Session Creation Rules
- guest → public
- learning → authenticated only, обязателен `lesson_id`

---

## Session Completion Rules
- `POST /sessions/{id}/complete` идемпотентен по результату, но
  повторный вызов для завершённой сессии возвращает 409 Conflict;
- финальные `cpm`/`accuracy` рассчитываются исключительно из
  `KeystrokeEvent`, переданных в этом запросе (Reproducibility,
  ANALYTICS_SPECIFICATION, раздел 4).

---

## Content API Constraints
- эндпоинты раздела "Content API" — read-only;
- Backend MUST не возвращать записи `content` со статусом, отличным от
  `published` (ADMIN_PANEL_SPECIFICATION, 5.2);
- идентификаторы (`text_id`, `course_id`, `lesson_id`,
  `language_id`), возвращаемые Content API, являются soft references,
  используемыми в `app`-схеме (DATABASE_SPECIFICATION, 1.3).

---

## Pagination Enforcement
Все list endpoints обязаны поддерживать page/limit.

---

# Acceptance Criteria

Документ считается валидным, если:
- нет посторонних символов или мусора в тексте;
- email verification API добавлен;
- session API разделён на guest/learning и формализован флоу
  завершения сессии (`/sessions/{id}/complete`) с финальными
  cpm/accuracy;
- lesson attempts API добавлен;
- добавлен Content API (`/languages`, `/courses`, `/lessons`,
  `/texts`) как read-only слой над `content`-схемой;
- добавлен Certificates API, согласованный с `Certificate` из
  DATABASE_SPECIFICATION v1.2 и условиями выдачи из
  COURSE_SPECIFICATION;
- добавлен Achievements API и Subscriptions API (read-only),
  согласованные с соответствующими сущностями DATABASE_SPECIFICATION
  v1.2;
- добавлен Analytics API, согласованный с ANALYTICS_SPECIFICATION v1.0;
- pagination стандартизирован и покрывает все list-эндпоинты, включая
  новые;
- logout invalidation определён;
- документ совместим с DATABASE_SPECIFICATION v1.2.
