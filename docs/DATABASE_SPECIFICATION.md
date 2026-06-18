# DATABASE_SPECIFICATION.md

## Version
DATABASE_SPECIFICATION v1.2

## Changelog (v1.1 → v1.2)
- добавлен раздел "Schema Architecture" (разделение `app` и `content`
  схем);
- добавлены сущности `TypingSession`, `LessonAttempt`, `Certificate`,
  `Achievement`, `Subscription` (ранее отсутствовали как полноценные
  описания, хотя упоминались в Relationships v1.1);
- добавлен раздел "Content Schema (Reference)" — `Language`,
  `Category`, `DifficultyLevel`, `TypingText`, `Course`, `Lesson`,
  управляемые через Directus (см. ADMIN_PANEL_SPECIFICATION v1.0,
  COURSE_SPECIFICATION v1.0);
- обновлены Indexing Requirements и Data Consistency Rules с учётом
  новых сущностей;
- зафиксировано правило "soft reference" для связей между `app` и
  `content` схемами.

Совместим с:
- PROJECT_VISION v1.0
- SYSTEM_ARCHITECTURE v1.0
- API_SPECIFICATION v1.2
- FRONTEND_SPECIFICATION v1.0
- COURSE_SPECIFICATION v1.0
- ADMIN_PANEL_SPECIFICATION v1.0
- ANALYTICS_SPECIFICATION v1.0

---

# 1. Schema Architecture

База данных физически может располагаться в одном инстансе PostgreSQL,
но логически разделена на две схемы:

## 1.1 Схема `app` (источник истины — Backend / Prisma)
Хранит все данные, относящиеся к пользователям, сессиям, прогрессу и
аналитике:
- `User`
- `TypingSession`
- `KeystrokeEvent`
- `LessonAttempt`
- `Certificate`
- `Achievement`
- `Subscription`
- `EventLog`

## 1.2 Схема `content` (источник истины — Directus)
Хранит контентные сущности, управляемые через CMS
(см. ADMIN_PANEL_SPECIFICATION):
- `Language`
- `Category`
- `DifficultyLevel`
- `TypingText`
- `Course`
- `Lesson`

## 1.3 Architectural Rule: Cross-Schema References
- сущности `app` ссылаются на сущности `content` **только по
  идентификатору** (`text_id`, `course_id`, `lesson_id`,
  `language_id`) — это "soft reference";
- между схемами `app` и `content` НЕ создаются FK-constraints на
  уровне PostgreSQL — Backend и Directus являются независимыми
  владельцами своих схем (повтор правила из SYSTEM_ARCHITECTURE: "CMS
  Content Integration Module" — однонаправленная интеграция);
- целостность soft reference (существование `content`-записи по ID)
  обеспечивается на уровне приложения (Backend проверяет
  существование контента при обращении к Directus / кэшу), а не на
  уровне БД.

---

# 2. Схема `app` — Сущности

## 2.1 User

### Fields
- `id`
- `email`
- `nickname`
- `password_hash`
- `email_verified`
- `role` (`user` | `premium` | `admin`, см. PROJECT_VISION, 13)
- `preferred_language_id` (soft reference → `content.Language`)
- `created_at`
- `updated_at`

### Relationships
- User → TypingSession (1:N)
- User → LessonAttempt (1:N)
- User → Certificate (1:N)
- User → Achievement (1:N)
- User → Subscription (1:N)
- User → EventLog (1:N)

### Notes
- информация о подписке хранится исключительно через сущность
  `Subscription`. Поле `subscription_type` в `User` отсутствует
  (правило сохранено из v1.1);
- `role` остаётся в `User` (является частью авторизационной модели, а
  не биллинговой — отличие от `Subscription`, см. раздел 5).

---

## 2.2 TypingSession

### Purpose
Хранит сессии печати — как `guest`, так и `learning`
(см. API_SPECIFICATION, Session API).

### Fields
- `id`
- `user_id` (nullable — отсутствует для `guest`-сессий)
- `session_type` (`guest` | `learning`)
- `text_id` (soft reference → `content.TypingText`)
- `started_at`
- `ended_at` (nullable до завершения сессии)
- `cpm` (final, nullable до завершения)
- `accuracy` (final, nullable до завершения)
- `status` (`active` | `completed` | `abandoned`)

### Relationships
- TypingSession → User (N:1, nullable)
- TypingSession → KeystrokeEvent (1:N)
- TypingSession → LessonAttempt (1:1, только для `learning`)

### Rules
- `user_id` MUST быть NOT NULL, если `session_type = 'learning'`
  (Critical Rule из API_SPECIFICATION: "Learning session НЕ может быть
  создан анонимно");
- для `session_type = 'guest'` запись `TypingSession` MAY не создаваться
  на постоянной основе (PROJECT_VISION, 6.1: "может работать полностью
  stateless") — если создаётся, MAY быть удалена/архивирована после
  завершения теста без влияния на правила immutability (guest-сессии не
  относятся к историческим данным пользователя);
- `cpm` и `accuracy` являются **финальными подтверждёнными** значениями
  (рассчитываются Backend из `KeystrokeEvent` при завершении сессии,
  см. ANALYTICS_SPECIFICATION, 3.1–3.2).

---

## 2.3 KeystrokeEvent

(без изменений относительно v1.1)

### Fields
- `id`
- `session_id`
- `text_id`
- `position_index`
- `expected_char`
- `typed_char`
- `timestamp`
- `reaction_time_ms`
- `is_correct`

### Relationships
- KeystrokeEvent → TypingSession (N:1)
- KeystrokeEvent → TypingText (N:1, soft reference в `content`)

### Rules
- является первичным источником данных системы;
- после создания изменение запрещено (immutable, append-only);
- поле `text_id` добавлено для упрощения аналитических вычислений и
  прямой связи с исходным текстом (soft reference → `content.TypingText`).

---

## 2.4 LessonAttempt

### Purpose
Хранит результат попытки прохождения урока
(см. COURSE_SPECIFICATION, раздел 3).

### Fields
- `id`
- `user_id`
- `lesson_id` (soft reference → `content.Lesson`)
- `session_id`
- `cpm` (final)
- `accuracy` (final)
- `is_passed`
- `created_at`

### Relationships
- LessonAttempt → User (N:1)
- LessonAttempt → TypingSession (1:1)
- LessonAttempt → Lesson (N:1, soft reference)

### Rules
- создаётся при завершении `learning`-сессии, связанной с уроком;
- append-only — повторные попытки создают новые записи, существующие
  не редактируются (PROJECT_VISION, 14: "Session Data MUST храниться
  append-only");
- `is_passed = (cpm >= lesson.target_cpm) AND (accuracy >=
  lesson.target_accuracy)`, где `lesson.target_cpm` /
  `lesson.target_accuracy` читаются из `content.Lesson`.

---

## 2.5 Certificate

### Purpose
Хранит выданные пользователю сертификаты
(см. COURSE_SPECIFICATION, раздел 6).

### Fields
- `id`
- `user_id`
- `course_id` (soft reference → `content.Course`)
- `issued_at`
- `cpm_at_issue`
- `accuracy_at_issue`
- `file_url` (ссылка на сгенерированный PDF)

### Relationships
- Certificate → User (N:1)
- Certificate → Course (N:1, soft reference)

### Rules
- создаётся, когда выполнены условия `course.certificate_config`
  (COURSE_SPECIFICATION, 6.1);
- immutable после создания (append-only); повторное достижение условий
  курса создаёт новую запись `Certificate`, не изменяет существующую
  (COURSE_SPECIFICATION, 6.4);
- создание `Certificate` MUST сопровождаться записью канонического
  события `certificate_issued` в `EventLog`.

---

## 2.6 Achievement

### Purpose
Хранит разблокированные достижения пользователя.

### Fields
- `id`
- `user_id`
- `achievement_type` (код достижения)
- `unlocked_at`
- `metadata_json` (nullable — дополнительные данные о достижении)

### Relationships
- Achievement → User (N:1)

### Rules
- append-only, immutable после создания;
- создание записи MUST сопровождаться записью канонического события
  `achievement_unlocked` в `EventLog`;
- набор возможных `achievement_type` определяется конфигурацией
  приложения (не входит в `content`-схему, так как не является
  обучающим контентом, а частью игровой/мотивационной механики
  продукта — FUTURE-направление по PROJECT_VISION, 13).

---

## 2.7 Subscription

### Purpose
Хранит данные о подписке пользователя (Future-Ready Monetization Layer,
PROJECT_VISION, 13).

### Fields
- `id`
- `user_id`
- `plan` (`free` | `premium`, расширяемо)
- `status` (`active` | `canceled` | `expired`)
- `started_at`
- `ended_at` (nullable)

### Relationships
- Subscription → User (N:1)

### Rules
- единственный источник истины для информации о подписке
  (Subscription Ownership, см. раздел 6.1);
- `User.role = 'premium'` MUST быть согласован с наличием активной
  `Subscription` с `plan = 'premium'` и `status = 'active'`
  (синхронизация роли при изменении статуса подписки — на уровне
  бизнес-логики Backend, не на уровне DB-constraint, так как `content`
  и `app` разделены, а роль — атрибут `app.User`).

---

## 2.8 EventLog

(без изменений относительно v1.1)

### Purpose
Хранение канонических событий системы.

### Fields
- `id`
- `event_type`
- `user_id` (nullable)
- `session_id` (nullable)
- `lesson_attempt_id` (nullable)
- `payload_json`
- `created_at`

### Relationships
- EventLog → User (N:1)
- EventLog → TypingSession (N:1)
- EventLog → LessonAttempt (N:1)

### Canonical Event Types
- `start_session`
- `end_session`
- `lesson_started`
- `lesson_completed`
- `certificate_issued`
- `achievement_unlocked`

### Rules
- `EventLog` является append-only сущностью;
- изменение и удаление исторических записей запрещено;
- `EventLog` используется как каноническое хранилище событий
  аналитической системы (ANALYTICS_SPECIFICATION, раздел 2).

---

# 3. Схема `content` (Reference)

Сущности этой схемы являются **источником истины Directus** и
описываются здесь только как справочные (для понимания soft-reference
полей в схеме `app`). Полное описание полей и правил валидации — в
ADMIN_PANEL_SPECIFICATION v1.0 и COURSE_SPECIFICATION v1.0.

## 3.1 Language
- `id`, `code`, `name`, `is_active`

## 3.2 Category
- `id`, `name`, `type` (`fiction` | `non_fiction`)

## 3.3 DifficultyLevel
- `id`, `name`, `level_order`

## 3.4 TypingText
- `id`, `title`, `content`, `language_id`, `category_id`,
  `difficulty_level_id`, `length_chars`, `is_published`

## 3.5 Course
- `id`, `title`, `description`, `language_id`, `level_id`, `order`,
  `certificate_config` (json: `min_cpm`, `min_accuracy`), `is_published`

## 3.6 Lesson
- `id`, `course_id`, `title`, `order`, `text_id`, `target_cpm`,
  `target_accuracy`, `difficulty_tag_id`

## Architectural Rule
Backend MUST NOT создавать FK-constraints из `app` в `content` на
уровне PostgreSQL. Доступ Backend к `content` — read-only (через API
Directus либо read-only реплику/view), см. ADMIN_PANEL_SPECIFICATION,
раздел 6.

---

# 4. Indexing Requirements

## User
- `email` (unique)
- `preferred_language_id`

## TypingSession
- `user_id`
- `text_id`
- `started_at`
- `(user_id, session_type)`

## KeystrokeEvent
- `session_id`
- `timestamp`
- `position_index`
- `(session_id, position_index)`

## LessonAttempt
- `user_id`
- `lesson_id`
- `(user_id, lesson_id, created_at)` — для определения статуса
  разблокировки уроков (COURSE_SPECIFICATION, 3.3)

## Certificate
- `user_id`
- `course_id`
- `(user_id, course_id)`

## Achievement
- `user_id`
- `achievement_type`

## Subscription
- `user_id`
- `(user_id, status)`

## EventLog
- `event_type`
- `user_id`
- `session_id`
- `created_at`

---

# 5. Data Consistency Rules

## 5.1 Subscription Ownership
Подписка не хранится в сущности `User`. Единственным источником данных
о подписке является сущность `Subscription`.

## 5.2 Event Consistency
Все события предметной области должны фиксироваться через `EventLog`.
Аналитическая система должна использовать `EventLog` как источник
событий.

## 5.3 Reproducibility
Следующие показатели должны вычисляться из:
- `KeystrokeEvent`
- `EventLog`

Запрещается использовать агрегированные данные как источник истины
для:
- CPM
- Accuracy
- Error Rate
- Reaction Time

## 5.4 Immutability & Append-Only (расширено в v1.2)
Следующие сущности являются immutable/append-only:
- `KeystrokeEvent` — immutable после создания;
- `EventLog` — append-only, без UPDATE/DELETE;
- `LessonAttempt` — append-only (повторные попытки — новые записи);
- `Certificate` — immutable после создания, append-only при
  перевыдаче;
- `Achievement` — immutable после создания.

`TypingSession` и `Subscription` допускают изменение состояния
(`status`, `ended_at`, финальные `cpm`/`accuracy` для
`TypingSession`), но не допускают изменение исторических идентификаторов
(`user_id`, `session_type`, `text_id`, `lesson_id`/`course_id` через
связанные сущности).

## 5.5 Cross-Schema Soft Reference (новое в v1.2)
- ссылки `app` → `content` (`text_id`, `course_id`, `lesson_id`,
  `language_id`, `category_id`, `difficulty_level_id`) не
  обеспечиваются FK на уровне PostgreSQL;
- удаление/архивация записи в `content` НЕ приводит к удалению
  исторических записей `app` (`KeystrokeEvent`, `LessonAttempt`,
  `Certificate`, `TypingSession`) — исторические данные сохраняют
  ссылку даже на архивный контент (соответствует Reproducibility:
  пересчёт метрик не должен зависеть от текущего состояния CMS).

---

# 6. Acceptance Criteria

Документ считается готовым, если:
- нет посторонних символов или мусора в тексте;
- определена архитектура схем `app` / `content` и правило soft
  reference между ними;
- полностью описаны все сущности из Core Domain Entities
  (SYSTEM_ARCHITECTURE): `User`, `TypingSession`, `KeystrokeEvent`,
  `TypingText` (reference), `Course` (reference), `Lesson` (reference),
  `LessonAttempt`, `Certificate`, `Achievement`, `Subscription`,
  `Language` (reference), `EventLog`;
- Indexing Requirements покрывают все сущности схемы `app`;
- Data Consistency Rules покрывают Reproducibility, Immutability/
  Append-Only и Cross-Schema Soft Reference;
- документ совместим с API_SPECIFICATION v1.2, COURSE_SPECIFICATION
  v1.0 и ADMIN_PANEL_SPECIFICATION v1.0.
