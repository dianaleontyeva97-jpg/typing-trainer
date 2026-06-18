# ANALYTICS_SPECIFICATION.md

## Version
ANALYTICS_SPECIFICATION v1.0

Совместим с:
- PROJECT_VISION v1.0
- SYSTEM_ARCHITECTURE v1.0
- API_SPECIFICATION v1.2
- DATABASE_SPECIFICATION v1.2
- COURSE_SPECIFICATION v1.0

---

# 1. Общие положения

Документ определяет аналитическую модель системы: канонические события,
производные метрики, правила воспроизводимости и API для получения
аналитики.

## Architectural Rule (повтор SYSTEM_ARCHITECTURE)
Источниками истины являются исключительно первичные данные:
- `KeystrokeEvent` (raw keystrokes);
- `EventLog` (session/domain events).

Analytics Layer и Adaptive Learning Layer работают только на основе
сохранённых данных и не являются источником истины. Любая
агрегированная метрика MUST быть пересчитываема из первичных данных.

---

# 2. Event Model

## 2.1 Atomic Analytics Unit
Базовая единица аналитики — `keystroke_event` (см. PROJECT_VISION, 11).
Каждый введённый символ — отдельное событие, хранится в таблице
`KeystrokeEvent`.

## 2.2 Canonical Events (EventLog)
Каноническая и закрытая на момент v1.0 семантика событий
(SYSTEM_ARCHITECTURE: "Семантика канонических событий не должна
изменяться после публикации спецификации"):

| Событие | Триггер | Обязательные поля payload |
|---|---|---|
| `start_session` | создание `TypingSession` (guest или learning) | `session_id`, `session_type`, `text_id` |
| `end_session` | завершение сессии, подтверждённые метрики получены | `session_id`, `cpm`, `accuracy`, `duration_ms` |
| `lesson_started` | пользователь открывает учебную сессию урока | `lesson_id`, `course_id`, `session_id` |
| `lesson_completed` | сессия урока завершена и оценена | `lesson_id`, `lesson_attempt_id`, `is_passed`, `cpm`, `accuracy` |
| `certificate_issued` | выполнены условия выдачи сертификата (COURSE_SPECIFICATION, 6.1) | `course_id`, `certificate_id` |
| `achievement_unlocked` | выполнены условия достижения | `achievement_id` |

## 2.3 Расширение модели
Добавление новых типов событий допускается только как расширение
существующего набора (без изменения семантики существующих событий) и
сопровождается обновлением версии данного документа (v1.1, v1.2 и т.д.).

---

# 3. Производные метрики (Derived Metrics)

## 3.1 CPM (Characters Per Minute)

### Формула
```
CPM = correct_characters / (session_duration_ms / 60000)
```
где `correct_characters` — количество `KeystrokeEvent` с `is_correct = true`
для данной `session_id`.

### Расчёт
- **Предварительный** (frontend, во время сессии) — для UX, не хранится
  как источник истины;
- **Финальный** (backend, после `end_session`) — рассчитывается из
  `KeystrokeEvent` и сохраняется в `LessonAttempt.cpm` /
  `EventLog.payload_json` (`end_session`/`lesson_completed`).

## 3.2 Accuracy

### Формула
```
Accuracy = correct_characters / total_typed_characters
```
где обе величины — агрегаты по `KeystrokeEvent.is_correct` для
`session_id`.

## 3.3 Error Rate
```
Error Rate = 1 - Accuracy
```

## 3.4 Reaction Time
Агрегаты (среднее/медиана/перцентили) по полю
`KeystrokeEvent.reaction_time_ms` для заданного `session_id`,
`user_id` или временного периода.

## 3.5 Error Frequency по символам
Группировка `KeystrokeEvent` с `is_correct = false` по
`(expected_char, typed_char)` для:
- идентификации часто ошибочных символов/комбинаций
  (PROJECT_VISION, 9 — "История ошибок");
- формирования входных данных для Adaptive Learning Layer
  (COURSE_SPECIFICATION, раздел 5).

## 3.6 Learning Progress
Производная метрика на основе:
- количества `LessonAttempt` с `is_passed = true`;
- покрытия уроков курса (COURSE_SPECIFICATION, 4.2);
- динамики CPM/accuracy по времени (тренды).

---

# 4. Reproducibility Rules

## 4.1 Запрещённые источники истины
Запрещается использовать агрегированные/кэшированные значения как
источник истины для:
- CPM;
- Accuracy;
- Error Rate;
- Reaction Time
(повтор правила из DATABASE_SPECIFICATION, "Reproducibility").

## 4.2 Принцип пересчёта
Любое представление метрики (дашборд, отчёт, API-ответ) MUST иметь
возможность быть пересчитанным из:
- `KeystrokeEvent` — для метрик уровня сессии/символа;
- `EventLog` — для метрик уровня доменных событий (уроки, курсы,
  сертификаты, достижения).

## 4.3 Хранение агрегатов (допускается, но не как первичный источник)
SHOULD допускается материализация агрегатов (например,
`materialized view` или денормализованные таблицы статистики) для
производительности дашбордов, при условии:
- наличия процесса полного пересчёта из первичных данных;
- явной маркировки таких таблиц как derived/cache.

---

# 5. Analytics Pipeline

## 5.1 Поток обработки (повтор PROJECT_VISION, 5 / SYSTEM_ARCHITECTURE)
```
User Input
   ↓
Typing Engine
   ↓
Session Layer
   ↓
Backend API
   ↓
Keystroke Storage (KeystrokeEvent)
   ↓
Analytics Layer (EventLog + derived metrics)
   ↓
Adaptive Learning Layer
```

## 5.2 Этапы обработки событий
1. Backend записывает `KeystrokeEvent` (immutable, append-only) при
   получении данных сессии.
2. Backend записывает канонические события в `EventLog`
   (`start_session`, `end_session`, `lesson_started`,
   `lesson_completed`, `certificate_issued`, `achievement_unlocked`).
3. Analytics Layer вычисляет производные метрики по требованию
   (синхронно для API-ответов) и/или периодически (batch-пересчёт для
   агрегатов/дашбордов).
4. Adaptive Learning Layer потребляет производные метрики и историю
   ошибок для формирования рекомендаций по сложности контента.

---

# 6. Analytics API (расширение API_SPECIFICATION)

Раздел определяет дополнительные read-only эндпоинты аналитики.
Все списковые ответы подчиняются Pagination Rule (API_SPECIFICATION,
Global: `page`, `limit`).

## 6.1 Личная аналитика пользователя

### GET /analytics/me/summary
Authentication required.

#### Response
- `current_cpm` (на основе последних N сессий)
- `current_accuracy`
- `total_sessions`
- `total_lessons_completed`
- `learning_progress` (по активным курсам)

### GET /analytics/me/trends
Authentication required.

#### Query Parameters
- `period` (`day` | `week` | `month`)
- `page`, `limit`

#### Response
- временной ряд CPM/accuracy, агрегированный по `period`

### GET /analytics/me/error-stats
Authentication required.

#### Response
- список наиболее часто ошибочных символов/комбинаций
  (`expected_char`, `typed_char`, `count`)

## 6.2 Architectural Rule
Все эндпоинты раздела 6 являются **read-only** и не создают новых
записей `EventLog`/`KeystrokeEvent` — они только агрегируют
существующие первичные данные.

---

# 7. Данные для Adaptive Learning Layer

В соответствии с COURSE_SPECIFICATION, раздел 5, Analytics Layer
предоставляет Adaptive Learning Layer:
- текущий CPM/accuracy пользователя;
- историю `LessonAttempt` (включая `is_passed`, временные метки);
- статистику ошибочных символов (раздел 3.5);
- устойчивость результатов (стандартное отклонение CPM/accuracy за
  последние N попыток).

---

# 8. Acceptance Criteria

Документ считается готовым, если:
- определена атомарная единица аналитики (`keystroke_event`) и
  канонический список событий `EventLog`, совместимый с
  SYSTEM_ARCHITECTURE и DATABASE_SPECIFICATION;
- определены формулы для CPM, Accuracy, Error Rate, Reaction Time,
  Error Frequency, Learning Progress;
- зафиксированы правила Reproducibility (агрегаты не являются
  источником истины);
- описан analytics pipeline, согласованный с PROJECT_VISION (раздел 5)
  и SYSTEM_ARCHITECTURE (Data Flow);
- определены read-only эндпоинты Analytics API с поддержкой pagination;
- определён набор данных, передаваемых в Adaptive Learning Layer;
- документ совместим с PROJECT_VISION v1.0, SYSTEM_ARCHITECTURE v1.0,
  API_SPECIFICATION v1.2, DATABASE_SPECIFICATION v1.2 и
  COURSE_SPECIFICATION v1.0.
