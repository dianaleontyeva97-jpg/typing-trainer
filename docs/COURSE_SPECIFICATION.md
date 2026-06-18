# COURSE_SPECIFICATION.md

## Version
COURSE_SPECIFICATION v1.0

Совместим с:
- PROJECT_VISION v1.0
- SYSTEM_ARCHITECTURE v1.0
- API_SPECIFICATION v1.2
- DATABASE_SPECIFICATION v1.2

---

# 1. Общие положения

Документ определяет структуру учебного контента (курсы, уроки, тексты),
правила прогресса пользователя, критерии прохождения уроков, адаптивную
сложность и условия выдачи сертификатов.

Источником истины для контента курсов является Directus CMS
(см. SYSTEM_ARCHITECTURE, "CMS Content Integration Module").
Источником истины для прогресса пользователя является Backend API /
PostgreSQL (см. PROJECT_VISION, 4.2).

---

# 2. Доменная модель курса

## 2.1 Иерархия сущностей

```
Language
  └── Course
        └── Lesson
              └── TypingText (ссылка на текст урока)

User
  └── LessonAttempt (N попыток на Lesson)
  └── Certificate (по завершении Course)
```

## 2.2 Course
Управляется через Directus.

### Поля (MUST)
- `id`
- `title`
- `description`
- `language_id`
- `level` (вводный/базовый/продвинутый — определяется конфигурацией)
- `order` (порядок отображения в каталоге)
- `is_published`
- `certificate_config` (минимальный CPM и accuracy для сертификата,
  см. раздел 6)

### Relationships
- Course → Lesson (1:N)
- Course → Language (N:1)
- Course → Certificate (1:N, через User)

## 2.3 Lesson
Управляется через Directus.

### Поля (MUST)
- `id`
- `course_id`
- `title`
- `order`
- `text_id` (ссылка на TypingText)
- `target_cpm`
- `target_accuracy`
- `difficulty_tag` (используется адаптивной системой, см. раздел 5)

### Relationships
- Lesson → Course (N:1)
- Lesson → TypingText (N:1)
- Lesson → LessonAttempt (1:N)

## 2.4 TypingText
Управляется через Directus.

### Поля (MUST)
- `id`
- `title`
- `content`
- `language_id`
- `category` (художественный / научно-популярный, см. PROJECT_VISION, 10)
- `difficulty_level`
- `length_chars`

### Architectural Rule
TypingText является контентной сущностью. Содержимое текста не
изменяется после использования в активных сессиях задним числом —
изменения применяются только к новым сессиям (immutability контента,
используемого в уже завершённых KeystrokeEvent, не требуется, так как
KeystrokeEvent хранит `text_id`, а не копию текста — целостность
исторических метрик обеспечивается на уровне
DATABASE_SPECIFICATION/Reproducibility).

## 2.5 LessonAttempt
Хранится в PostgreSQL (источник истины — Backend).

### Поля (MUST)
- `id`
- `user_id`
- `lesson_id`
- `session_id`
- `cpm` (final, подтверждённое Backend значение)
- `accuracy` (final)
- `is_passed`
- `created_at`

### Relationships
- LessonAttempt → User (N:1)
- LessonAttempt → Lesson (N:1)
- LessonAttempt → TypingSession (1:1)

Соответствует API_SPECIFICATION: `GET /lesson-attempts`,
`GET /lesson-attempts/{id}`.

---

# 3. Прохождение урока

## 3.1 Критерий прохождения (MUST)
Урок считается пройденным (`is_passed = true`), если по итогам
learning-сессии одновременно выполняются условия:
- `cpm >= lesson.target_cpm`
- `accuracy >= lesson.target_accuracy`

## 3.2 Повторные попытки
- Количество попыток на урок не ограничено.
- Каждая попытка сохраняется как отдельная запись `LessonAttempt`
  (append-only, см. PROJECT_VISION, 14 — Session Data MUST храниться
  append-only).
- Текущий статус урока для пользователя определяется как
  "пройден, если существует хотя бы одна `LessonAttempt` с
  `is_passed = true`".

## 3.3 Разблокировка следующего урока
- Lesson N+1 в рамках Course становится доступен пользователю, если
  Lesson N имеет хотя бы одну успешную попытку (`is_passed = true`).
- Первый урок курса (`order = 1`) доступен всегда.

### Architectural Rule
Разблокировка является производным состоянием и MUST вычисляться на
основе записей `LessonAttempt` (Reproducibility, см.
SYSTEM_ARCHITECTURE).

---

# 4. Прохождение курса

## 4.1 Условие завершения курса (MUST)
Курс считается завершённым пользователем, если для каждого `Lesson`,
принадлежащего `Course`, существует хотя бы одна успешная
`LessonAttempt`.

## 4.2 Производный статус
Прогресс курса (`completed_lessons / total_lessons`) является
производным значением и пересчитывается из `LessonAttempt`
(не хранится как самостоятельное мутируемое поле, либо хранится как
materialized/денормализованное поле с возможностью пересчёта).

---

# 5. Адаптивная сложность (Adaptive Learning)

В соответствии с PROJECT_VISION, раздел 9.

## 5.1 Источники данных
- CPM (исторический и текущий);
- Accuracy;
- история `LessonAttempt`;
- статистика ошибок по символам (на основе `KeystrokeEvent`).

## 5.2 Правила (SHOULD)

### Высокая точность
Если пользователь стабильно (на протяжении настраиваемого количества
последних попыток) показывает accuracy выше порогового значения:
- рекомендуются уроки с более высоким `difficulty_tag`;
- увеличивается целевая длина текстов (`length_chars`).

### Низкая точность
Если accuracy ниже порогового значения:
- рекомендуются уроки с более низким `difficulty_tag`;
- приоритет отдаётся текстам, содержащим символы из "истории ошибок"
  пользователя (часто ошибочные `expected_char`/`typed_char` пары из
  `KeystrokeEvent`).

## 5.3 Architectural Rule
Adaptive Learning Layer работает только на основе сохранённых данных
(`KeystrokeEvent`, `EventLog`, `LessonAttempt`) и не модифицирует
контент в Directus. Рекомендации формируются как отдельный
производный слой над существующими `Lesson`/`Course` (например,
изменение порядка отображения или приоритезация, но не создание новых
сущностей контента).

---

# 6. Сертификаты

## 6.1 Условия выдачи (MUST)
Сертификат выдаётся пользователю по `Course`, если:
1. курс завершён (раздел 4.1);
2. итоговые показатели пользователя по курсу удовлетворяют
   `certificate_config` курса:
   - агрегированный/итоговый CPM >= `certificate_config.min_cpm`;
   - агрегированный/итоговый accuracy >= `certificate_config.min_accuracy`.

Конкретные числовые пороги определяются конфигурацией курса в
Directus (поле `certificate_config`), а не хардкодятся в коде.

## 6.2 Формат
PDF (см. PROJECT_VISION, 12).

## 6.3 Событие
Выдача сертификата фиксируется каноническим событием
`certificate_issued` в `EventLog` (см. DATABASE_SPECIFICATION,
Canonical Event Types).

## 6.4 Immutability
Сертификат, после выдачи, не редактируется. Повторная выдача
(например, при перепрохождении курса с лучшим результатом) создаёт
новую запись `Certificate`, а не изменяет существующую (append-only,
аналогично остальным данным сессий).

---

# 7. Контент и языки

## 7.1 Типы текстов (PROJECT_VISION, 10)
- художественные;
- научно-популярные.

## 7.2 Языки
| Язык | Статус |
|------|--------|
| RU   | MUST   |
| EN   | SHOULD |
| BY, UA | FUTURE |

## 7.3 Architectural Rule
- каждый `Course`, `Lesson` и `TypingText` MUST иметь привязку к
  `Language`;
- каталог курсов фильтруется по языку интерфейса/языку обучения,
  выбранному пользователем;
- структура контента проектируется как мультиязычная с первого
  релиза, даже если фактически заполнен только язык RU.

---

# 8. Источник контента и синхронизация

## 8.1 Directus как источник истины контента
- `Course`, `Lesson`, `TypingText`, `Language`, категории и уровни
  сложности управляются исключительно через Directus.
- Backend получает контент из Directus в режиме одностороннего чтения
  (read-only integration, см. SYSTEM_ARCHITECTURE).

## 8.2 Что Directus НЕ хранит (повтор ограничения SYSTEM_ARCHITECTURE)
- пользовательский прогресс;
- результаты обучения (`LessonAttempt`);
- аналитику;
- сертификаты;
- достижения.

## 8.3 Кэширование контента на Backend
Backend SHOULD кэшировать контентные сущности (Course/Lesson/TypingText)
для снижения количества обращений к Directus, с инвалидацией кэша при
изменениях в CMS (механизм инвалидации — webhook Directus либо TTL,
конкретный механизм определяется на этапе реализации).

---

# 9. Acceptance Criteria

Документ считается готовым, если:
- определена иерархия Course → Lesson → TypingText;
- определены обязательные поля Course, Lesson, TypingText, LessonAttempt;
- определён критерий прохождения урока (target_cpm, target_accuracy);
- определены правила разблокировки следующего урока и завершения курса;
- определены правила адаптивной сложности на основе CPM/accuracy/истории
  ошибок;
- определены условия выдачи сертификата и связь с каноническим событием
  `certificate_issued`;
- определена модель языков и типов контента (RU MUST/EN SHOULD/FUTURE);
- определена модель источника контента (Directus, read-only integration);
- документ совместим с PROJECT_VISION v1.0, SYSTEM_ARCHITECTURE v1.0 и
  DATABASE_SPECIFICATION v1.2.
