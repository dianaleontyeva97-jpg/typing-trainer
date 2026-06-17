'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import {
  initTypingState,
  processKeystroke,
  processBackspace,
  TypingState,
} from '../lib/typing-engine';

const SAMPLE_TEXTS = [
  'Быстрая коричневая лиса прыгает через ленивую собаку.',
  'Программирование — это искусство решения задач с помощью кода.',
  'Каждый день я становлюсь лучше в том, что делаю.',
];

export default function TypingTestPage() {
  const [text, setText] = useState(SAMPLE_TEXTS[0]);
  const [typingState, setTypingState] = useState<TypingState>(() =>
    initTypingState(SAMPLE_TEXTS[0]),
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    cpm: number;
    accuracy: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Защита от двойного вызова finishSession
  const isFinishingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Выбираем случайный текст только на клиенте
  useEffect(() => {
    const randomText =
      SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setText(randomText);
    setTypingState(initTypingState(randomText));
    setMounted(true);
  }, []);

  // Создаём guest-сессию при загрузке страницы
  useEffect(() => {
    if (!mounted) return;
    api.post('/sessions', {
      text_id: 'sample-text-001',
      session_type: 'guest',
    })
      .then(({ data }) => {
        setSessionId(data.id);
        sessionIdRef.current = data.id;
      })
      .catch((err) => console.error('Не удалось создать сессию:', err));
  }, [mounted]);

  // Завершение сессии
  const finishSession = useCallback(async (state: TypingState) => {
    // Защита от двойного вызова
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    try {
      const currentSessionId = sessionIdRef.current;
      if (currentSessionId) {
        const { data } = await api.post(
          `/sessions/${currentSessionId}/complete`,
          { keystroke_events: state.keystrokeEvents },
        );
        setResult({ cpm: data.cpm, accuracy: data.accuracy });
      } else {
        setResult({ cpm: state.cpm, accuracy: state.accuracy });
      }
    } catch (err) {
      console.error('Ошибка завершения сессии:', err);
      setResult({ cpm: state.cpm, accuracy: state.accuracy });
    }
  }, []);

  // Обработка клавиатуры
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (result) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        setTypingState((prev) => processBackspace(prev));
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

      setTypingState((prev) => {
        const newState = processKeystroke(prev, e.key);
        if (newState.isFinished) {
          finishSession(newState);
        }
        return newState;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, finishSession]);

  const restart = () => {
    const randomText =
      SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setText(randomText);
    setTypingState(initTypingState(randomText));
    setResult(null);
    isFinishingRef.current = false;

    api.post('/sessions', {
      text_id: 'sample-text-001',
      session_type: 'guest',
    })
      .then(({ data }) => {
        setSessionId(data.id);
        sessionIdRef.current = data.id;
      })
      .catch(console.error);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Результат
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-indigo-600">
                {result.cpm}
              </div>
              <div className="text-sm text-gray-500 mt-1">символов/мин</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-600">
                {Math.round(result.accuracy * 100)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">точность</div>
            </div>
          </div>
          <button
            onClick={restart}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Тест скорости печати
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Начните печатать — таймер запустится автоматически
        </p>

        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {typingState.cpm}
            </div>
            <div className="text-xs text-gray-500">симв/мин</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(typingState.accuracy * 100)}%
            </div>
            <div className="text-xs text-gray-500">точность</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {typingState.cursor}/{typingState.chars.length}
            </div>
            <div className="text-xs text-gray-500">символов</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 text-2xl leading-relaxed font-mono select-none">
          {typingState.chars.map((char, index) => (
            <span
              key={index}
              className={
                index === typingState.cursor
                  ? 'border-b-2 border-indigo-500'
                  : char.status === 'correct'
                  ? 'text-gray-400'
                  : char.status === 'incorrect'
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-800'
              }
            >
              {char.char}
            </span>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          Используйте Backspace для исправления ошибок
        </p>
      </div>
    </div>
  );
}