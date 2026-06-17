// ─── Typing Engine ────────────────────────────────────────────────────────────
// Независимый модуль сравнения символов (FRONTEND_SPECIFICATION §3)
// Char-level Unicode comparison, без keycodes, без привязки к раскладке.

export interface KeystrokeEvent {
  position_index: number;
  expected_char: string;
  typed_char: string;
  timestamp: string;
  reaction_time_ms: number;
  is_correct: boolean;
}

export interface CharState {
  char: string;
  status: 'pending' | 'correct' | 'incorrect';
}

export interface TypingState {
  chars: CharState[];
  cursor: number;
  keystrokeEvents: KeystrokeEvent[];
  startedAt: Date | null;
  lastKeystrokeAt: Date | null;
  isFinished: boolean;
  cpm: number;
  accuracy: number;
}

// ─── Нормализация (FRONTEND_SPECIFICATION §3.3) ───────────────────────────────

function normalize(str: string): string {
  return str
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

// ─── Инициализация состояния ──────────────────────────────────────────────────

export function initTypingState(text: string): TypingState {
  const normalizedText = normalize(text);
  return {
    chars: normalizedText.split('').map((char) => ({
      char,
      status: 'pending',
    })),
    cursor: 0,
    keystrokeEvents: [],
    startedAt: null,
    lastKeystrokeAt: null,
    isFinished: false,
    cpm: 0,
    accuracy: 0,
  };
}

// ─── Обработка ввода ──────────────────────────────────────────────────────────

export function processKeystroke(
  state: TypingState,
  typedChar: string,
): TypingState {
  if (state.isFinished || state.cursor >= state.chars.length) {
    return state;
  }

  const now = new Date();
  const normalizedTyped = normalize(typedChar);
  const expectedChar = state.chars[state.cursor].char;
  const isCorrect = normalize(expectedChar) === normalizedTyped;

  // Первый символ — запускаем таймер
  const startedAt = state.startedAt || now;
  const reactionTimeMs = state.lastKeystrokeAt
    ? now.getTime() - state.lastKeystrokeAt.getTime()
    : 0;

  const keystrokeEvent: KeystrokeEvent = {
    position_index: state.cursor,
    expected_char: expectedChar,
    typed_char: normalizedTyped,
    timestamp: now.toISOString(),
    reaction_time_ms: reactionTimeMs,
    is_correct: isCorrect,
  };

  const newChars = [...state.chars];
  newChars[state.cursor] = {
    char: expectedChar,
    status: isCorrect ? 'correct' : 'incorrect',
  };

  const newCursor = state.cursor + 1;
  const isFinished = newCursor >= state.chars.length;

  const newState: TypingState = {
    chars: newChars,
    cursor: newCursor,
    keystrokeEvents: [...state.keystrokeEvents, keystrokeEvent],
    startedAt,
    lastKeystrokeAt: now,
    isFinished,
    cpm: calculateCpm(state.keystrokeEvents, startedAt, now),
    accuracy: calculateAccuracy([...state.keystrokeEvents, keystrokeEvent]),
  };

  return newState;
}

// ─── Backspace ────────────────────────────────────────────────────────────────

export function processBackspace(state: TypingState): TypingState {
  if (state.cursor === 0) return state;

  const newChars = [...state.chars];
  newChars[state.cursor - 1] = {
    char: state.chars[state.cursor - 1].char,
    status: 'pending',
  };

  return {
    ...state,
    chars: newChars,
    cursor: state.cursor - 1,
    isFinished: false,
  };
}

// ─── Метрики (предварительные, FRONTEND_SPECIFICATION §3.4) ──────────────────

function calculateCpm(
  events: KeystrokeEvent[],
  startedAt: Date,
  now: Date,
): number {
  const correctChars = events.filter((e) => e.is_correct).length;
  const durationMs = now.getTime() - startedAt.getTime();
  if (durationMs < 1000) return 0;
  return Math.round(correctChars / (durationMs / 60000));
}

function calculateAccuracy(events: KeystrokeEvent[]): number {
  if (events.length === 0) return 0;
  const correct = events.filter((e) => e.is_correct).length;
  return Math.round((correct / events.length) * 100) / 100;
}