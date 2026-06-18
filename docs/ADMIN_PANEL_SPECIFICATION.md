# ADMIN_PANEL_SPECIFICATION.md

## Version
ADMIN_PANEL_SPECIFICATION v1.0

Совместим с:
- PROJECT_VISION v1.0
- SYSTEM_ARCHITECTURE v1.0
- DATABASE_SPECIFICATION v1.2
- COURSE_SPECIFICATION v1.0

---

# 1. Общие положения

Документ определяет конфигурацию административной панели (CMS) для
управления контентом тренажёра скорости печати.

## Architectural Rule
В роли админ-панели для управления контентом используется **Directus**
(см. PROJECT_VISION, 4.3 и SYSTEM_ARCHITECTURE, "CMS Content Integration
Module").

Кастомная разработка отдельного admin-фронтенда для CRUD-операций над
контентом НЕ требуется на текущем этапе — Directus предоставляет
готовый административный интерфейс над таблицами PostgreSQL,
выделенными в отдельную схему контента.

---

# 2. Назначение CMS

## Ответственность Directus (MUST)
- управление языками (`Language`);
- управление категориями текстов;
- управление уровнями сложности;
- управление текстами для печати (`TypingText`);
- управление курсами (`Course`);
- управление уроками (`Lesson`).

## Что Directus НЕ хранит (Architectural Rule)
- пользовательский прогресс;
- результаты обучения (`LessonAttempt`);
- аналитику;
- сертификаты;
- достижения;
- любые сущности, относящиеся к `User` и его данным.

Интеграция Directus с системой — **однонаправленная** (read-only для
Backend): Directus является источником контента, но не участвует в
записи пользовательских данных.

---

# 3. Роли и доступ в Directus

## 3.1 Роли (MUST)
- **Administrator** — полный доступ ко всем коллекциям контента,
  управлению пользователями Directus и настройками.
- **Content Editor** (SHOULD, расширяемая роль) — доступ к
  созданию/редактированию `TypingText`, `Lesson`, `Course` без
  возможности изменения системных настроек Directus.

## 3.2 Связь с ролевой моделью продукта
Роли Directus являются **независимыми** от ролевой модели приложения
(`user`, `premium`, `admin` из PROJECT_VISION, 13). Доступ к Directus
имеют только сотрудники, управляющие контентом, а не конечные
пользователи платформы.

## 3.3 Architectural Rule
Доступ к Directus MUST быть ограничен отдельной системой
аутентификации Directus и не должен быть доступен через
публичный фронтенд приложения.

---

# 4. Коллекции Directus (Content Collections)

## 4.1 Language
### Поля
- `id`
- `code` (например `ru`, `en`, `be`, `ua`)
- `name`
- `is_active`

### Правила
- MUST содержать запись для `ru` (PROJECT_VISION, 10: RU — MUST);
- `en` — SHOULD;
- `be`, `ua` — FUTURE, поля коллекции уже поддерживают добавление без
  изменения схемы.

## 4.2 Category
Категории текстов для печати.

### Поля
- `id`
- `name`
- `type` (`fiction` | `non_fiction` — соответствует "художественные" /
  "научно-популярные", PROJECT_VISION 10)

## 4.3 DifficultyLevel
### Поля
- `id`
- `name`
- `level_order` (числовой порядок сложности, используется адаптивной
  системой, см. COURSE_SPECIFICATION, раздел 5)

## 4.4 TypingText
### Поля
- `id`
- `title`
- `content` (текст для печати)
- `language` (relation → Language)
- `category` (relation → Category)
- `difficulty_level` (relation → DifficultyLevel)
- `length_chars` (вычисляемое/автозаполняемое поле)
- `is_published`

### Правила валидации (MUST)
- `content` не может быть пустым;
- `language` обязателен;
- при сохранении пересчитывается `length_chars`.

## 4.5 Course
### Поля
- `id`
- `title`
- `description`
- `language` (relation → Language)
- `level` (relation → DifficultyLevel)
- `order`
- `certificate_config` (JSON: `min_cpm`, `min_accuracy`)
- `is_published`

## 4.6 Lesson
### Поля
- `id`
- `course` (relation → Course)
- `title`
- `order`
- `text` (relation → TypingText)
- `target_cpm`
- `target_accuracy`
- `difficulty_tag` (relation → DifficultyLevel)

### Правила валидации (MUST)
- `order` уникален в пределах одного `course`;
- `target_cpm` и `target_accuracy` обязательны и должны быть > 0;
- `text.language` должен совпадать с `course.language`.

---

# 5. Публикационный процесс

## 5.1 Статусы контента
Все основные коллекции (`TypingText`, `Course`, `Lesson`) MUST иметь
поле статуса публикации (`is_published` или встроенный статус Directus
`draft / published / archived`).

## 5.2 Правило видимости для Backend
Backend при получении контента через интеграцию (раздел 6) MUST
запрашивать только записи со статусом `published`. Контент в статусе
`draft`/`archived` не должен быть доступен конечным пользователям.

---

# 6. Интеграция Directus ↔ Backend

## 6.1 Модель интеграции
- односторонняя (Directus → Backend);
- Backend читает контент из Directus через REST/GraphQL API Directus
  либо напрямую из БД (в рамках общей PostgreSQL-инсталляции, при
  условии разделения схем `content` и `app`);
- Directus не получает запросы записи от Backend.

## 6.2 Architectural Rule
Изменение схемы коллекций Directus (добавление полей контента) не
должно требовать изменений в модели пользовательских данных
(DATABASE_SPECIFICATION). Связь между доменами осуществляется через
идентификаторы (`text_id`, `lesson_id`, `course_id`), которые
Backend хранит как внешние ссылки на контент.

## 6.3 Инвалидация кэша контента
При публикации/обновлении записей в Directus, Backend SHOULD получать
уведомление (Directus webhook/flow) для инвалидации внутреннего кэша
контента (см. COURSE_SPECIFICATION, 8.3).

---

# 7. Ограничения и запреты

- Directus MUST NOT использоваться для хранения `User`, `TypingSession`,
  `KeystrokeEvent`, `LessonAttempt`, `Certificate`, `Achievement`,
  `Subscription`, `EventLog`;
- Directus MUST NOT иметь прямого доступа на запись к таблицам
  пользовательских данных;
- любые отчёты/дашборды по пользовательским данным реализуются вне
  Directus — в ANALYTICS_SPECIFICATION.

---

# 8. Acceptance Criteria

Документ считается готовым, если:
- определена роль Directus как единственной CMS для управления
  контентом;
- определены управляемые коллекции (Language, Category,
  DifficultyLevel, TypingText, Course, Lesson) с обязательными полями;
- определены роли доступа к Directus, отдельные от ролевой модели
  приложения;
- определён процесс публикации контента (draft/published);
- определена модель интеграции Directus ↔ Backend как
  однонаправленная (read-only для Backend);
- явно перечислены сущности, которые Directus НЕ хранит;
- документ совместим с PROJECT_VISION v1.0, SYSTEM_ARCHITECTURE v1.0,
  DATABASE_SPECIFICATION v1.2 и COURSE_SPECIFICATION v1.0.
