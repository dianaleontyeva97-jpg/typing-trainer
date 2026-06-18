# DEFINITION_OF_DONE.md

## Version
DEFINITION_OF_DONE v1.0

Совместим с:
- PROJECT_VISION v1.0
- SYSTEM_ARCHITECTURE v1.0
- DATABASE_SPECIFICATION v1.2
- API_SPECIFICATION v1.2
- FRONTEND_SPECIFICATION v1.0
- COURSE_SPECIFICATION v1.0
- ADMIN_PANEL_SPECIFICATION v1.0
- ANALYTICS_SPECIFICATION v1.0
- DEVELOPMENT_RULES v1.0

---

# 1. Общие положения

Документ определяет критерии "готовности" (Definition of Done) для
задач, фич и релиза MVP. Задача не считается завершённой, если не
выполнены применимые к ней критерии из данного документа.

---

# 2. Универсальные критерии (применимы к любой задаче)

Задача считается выполненной, если:
- код соответствует DEVELOPMENT_RULES (стандарты кода, naming,
  архитектурные правила);
- пройдены lint, typecheck и тесты в CI (DEVELOPMENT_RULES, 6.2);
- изменения не нарушают нормативный поток данных
  (SYSTEM_ARCHITECTURE, Data Flow);
- изменения не нарушают правила источников истины (raw keystrokes /
  EventLog как первичные данные, Directus только для контента);
- PR ссылается на соответствующий раздел спецификации;
- добавлены/обновлены тесты, покрывающие изменённую логику;
- документация (если затронута публичная модель — API, схема БД,
  контент-модель) обновлена соответствующим документом с увеличением
  версии при необходимости.

---

# 3. DoD: Backend (NestJS / Prisma / PostgreSQL)

## 3.1 Аутентификация
- [ ] `POST /auth/verify-email` реализован согласно API_SPECIFICATION;
- [ ] `POST /auth/resend-verification` требует авторизации и
      реализован согласно API_SPECIFICATION;
- [ ] `POST /auth/logout` инвалидирует и `access_token`, и
      `refresh_token` (проверено интеграционным тестом);
- [ ] хранение паролей — только `password_hash`.

## 3.2 Sessions
- [ ] `POST /sessions` поддерживает `session_type = guest | learning`;
- [ ] guest-сессия доступна без авторизации и не создаёт записи
      пользовательского прогресса;
- [ ] learning-сессия отклоняется без валидного access_token
      (интеграционный тест на Critical Rule);
- [ ] `GET /sessions` поддерживает `page`/`limit` и возвращает только
      сессии текущего пользователя.

## 3.3 Keystroke Storage
- [ ] `KeystrokeEvent` создаётся только операцией `INSERT`
      (нет `UPDATE`/`DELETE` в коде приложения);
- [ ] поля соответствуют DATABASE_SPECIFICATION (`session_id`,
      `text_id`, `position_index`, `expected_char`, `typed_char`,
      `timestamp`, `reaction_time_ms`, `is_correct`);
- [ ] индексы `(session_id, position_index)` и `session_id, timestamp`
      созданы согласно Indexing Requirements.

## 3.4 Lesson Attempts
- [ ] `GET /lesson-attempts` и `GET /lesson-attempts/{id}` требуют
      авторизации и возвращают только данные текущего пользователя
      (если не admin);
- [ ] `is_passed` вычисляется по правилу `cpm >= target_cpm AND
      accuracy >= target_accuracy` (COURSE_SPECIFICATION, 3.1);
- [ ] список поддерживает `page`/`limit`.

## 3.5 EventLog
- [ ] каждое каноническое событие (`start_session`, `end_session`,
      `lesson_started`, `lesson_completed`, `certificate_issued`,
      `achievement_unlocked`) записывается с полным набором полей
      `payload_json`, определённым в ANALYTICS_SPECIFICATION, 2.2;
- [ ] `EventLog` — append-only (нет операций изменения/удаления).

## 3.6 Pagination
- [ ] все list-эндпоинты из API_SPECIFICATION (Pagination Rule:
      `/courses`, `/texts`, `/sessions`, `/certificates`,
      `/lesson-attempts`) поддерживают `page` и `limit`.

---

# 4. DoD: Frontend (Next.js)

## 4.1 Typing Engine
- [ ] сравнение символов — char-level, Unicode, без keycodes и без
      зависимости от раскладки клавиатуры;
- [ ] выполняется нормализация (NFC, пробелы, переносы строк) перед
      сравнением;
- [ ] локальный расчёт CPM/accuracy реализован и помечен как
      предварительный в UI.

## 4.2 Маршруты и доступ
- [ ] Public Group доступна без авторизации
      (`/`, `/typing-test`, `/login`, `/register`, `/verify-email`,
      `/resend-verification`);
- [ ] Authenticated Group защищена проверкой access_token
      (`/dashboard`, `/courses/*`, `/history`, `/lesson-attempts/*`,
      `/certificates`, `/profile`);
- [ ] попытка начать learning-сессию без авторизации блокируется на
      Frontend до запроса к API.

## 4.3 Сессии
- [ ] guest-сессия (`/typing-test`) не отправляет данные в
      пользовательский прогресс;
- [ ] по завершении сессии UI отображает финальные (backend)
      значения CPM/accuracy, а не локальные.

## 4.4 UI-состояния
- [ ] для каждой страницы с данными реализованы состояния `loading`,
      `error`, `empty`, `success`;
- [ ] обработка 401 реализована (попытка refresh либо принудительный
      logout + редирект на `/login`).

## 4.5 Списковые страницы
- [ ] `/history`, `/lesson-attempts`, `/courses`, `/certificates`
      используют `page`/`limit` и компонент `Pagination`.

## 4.6 i18n
- [ ] инфраструктура i18n подключена;
- [ ] контент интерфейса для `ru` присутствует полностью;
- [ ] ключи переводов для `en` зарезервированы (даже если не
      переведены).

---

# 5. DoD: Контент и CMS (Directus)

- [ ] коллекции `Language`, `Category`, `DifficultyLevel`,
      `TypingText`, `Course`, `Lesson` созданы с полями согласно
      ADMIN_PANEL_SPECIFICATION;
- [ ] минимум один `Language` (`ru`) создан и активен;
- [ ] для каждого `Course` заполнен `certificate_config`
      (`min_cpm`, `min_accuracy`);
- [ ] для каждого `Lesson` указаны `target_cpm`, `target_accuracy`,
      и `text.language == course.language`;
- [ ] контент со статусом `draft`/неопубликован не возвращается через
      интеграцию Backend;
- [ ] Backend получает контент из Directus в режиме read-only (нет
      операций записи из приложения в Directus).

---

# 6. DoD: Адаптивное обучение и сертификаты

## 6.1 Прогресс и разблокировка
- [ ] разблокировка `Lesson N+1` вычисляется из наличия успешной
      `LessonAttempt` для `Lesson N` (производное состояние,
      пересчитываемое);
- [ ] завершение `Course` вычисляется из покрытия всех `Lesson`
      успешными попытками.

## 6.2 Сертификаты
- [ ] `Certificate` выдаётся только при выполнении условий
      `certificate_config` курса;
- [ ] выдача сертификата фиксируется событием `certificate_issued` в
      `EventLog`;
- [ ] сертификат генерируется в формате PDF;
- [ ] повторная выдача создаёт новую запись, не модифицирует
      существующую.

## 6.3 Adaptive Learning (SHOULD, не блокирует MVP)
- [ ] реализован базовый механизм рекомендаций сложности на основе
      CPM/accuracy и истории ошибок (может быть упрощённой версией на
      этапе MVP, но не противоречащей правилам COURSE_SPECIFICATION, 5).

---

# 7. DoD: Аналитика

- [ ] `GET /analytics/me/summary` возвращает текущие CPM/accuracy и
      прогресс, рассчитанные из `KeystrokeEvent`/`EventLog`;
- [ ] `GET /analytics/me/trends` поддерживает `period` и `page`/`limit`;
- [ ] `GET /analytics/me/error-stats` возвращает статистику ошибочных
      символов;
- [ ] любая отображаемая агрегированная метрика проходит проверку
      Reproducibility (тест: пересчёт из raw-данных совпадает с
      ответом API).

---

# 8. Release Readiness Checklist (MVP)

Релиз MVP считается готовым, если выполнены все пункты:

## Функциональность
- [ ] Public Typing Test работает без регистрации (guest mode);
- [ ] регистрация, подтверждение email, вход, выход работают
      end-to-end;
- [ ] Learning Mode доступен только авторизованным пользователям;
- [ ] минимум один опубликованный `Course` с минимум одним `Lesson`
      доступен в каталоге;
- [ ] прохождение урока создаёт `LessonAttempt` с корректным
      `is_passed`;
- [ ] завершение курса с выполнением условий выдаёт `Certificate`
      (PDF).

## Качество и безопасность
- [ ] все требования раздела 5 DEVELOPMENT_RULES (Безопасность)
      выполнены;
- [ ] CI pipeline зелёный на `main`;
- [ ] критические интеграционные тесты (guest/learning разделение,
      logout invalidation, immutability KeystrokeEvent) проходят.

## Документация
- [ ] все 10 документов спецификации (1–10) находятся в актуальных
      версиях и не противоречат друг другу;
- [ ] любые отклонения реализации от спецификации зафиксированы как
      явные изменения версий соответствующих документов.

---

# 9. Acceptance Criteria

Документ считается готовым, если:
- определены универсальные критерии готовности для любой задачи;
- определены детальные DoD-чеклисты для backend, frontend, CMS,
  адаптивного обучения/сертификатов и аналитики, покрывающие все
  критические правила из документов 1–9;
- определён Release Readiness Checklist для MVP;
- документ совместим со всеми ранее определёнными спецификациями
  (PROJECT_VISION v1.0 — DEVELOPMENT_RULES v1.0).
