'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

interface TypingText {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty: string;
  lengthChars: number;
  isPublished: boolean;
}

const EMPTY_FORM = {
  title: '',
  content: '',
  language_code: 'ru',
  category: 'fiction',
  difficulty: 'easy',
  is_published: true,
};

export default function AdminTextsPage() {
  const router = useRouter();
  const [texts, setTexts] = useState<TypingText[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadTexts();
  }, []);

  const loadTexts = async () => {
    try {
      const { data } = await api.get('/texts/admin');
      setTexts(data);
    } catch (err: any) {
      if (err.response?.status === 403) router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.patch(`/texts/admin/${editingId}`, form);
      } else {
        await api.post('/texts/admin', form);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      await loadTexts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (text: TypingText) => {
    setForm({
      title: text.title,
      content: text.content,
      language_code: 'ru',
      category: text.category,
      difficulty: text.difficulty,
      is_published: text.isPublished,
    });
    setEditingId(text.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Удалить текст "${title}"?`)) return;
    try {
      await api.delete(`/texts/admin/${id}`);
      await loadTexts();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePublish = async (id: string, current: boolean) => {
    try {
      await api.patch(`/texts/admin/${id}`, { is_published: !current });
      await loadTexts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">Админ — Тексты</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← В кабинет
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Всего текстов: {texts.length}
          </h2>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY_FORM); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            {showForm && !editingId ? 'Отмена' : '+ Добавить текст'}
          </button>
        </div>

        {/* Форма */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              {editingId ? 'Редактировать текст' : 'Новый текст'}
            </h3>
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текст
                  <span className="ml-2 text-gray-400 font-normal">
                    ({form.content.length} символов)
                  </span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Язык</label>
                  <select
                    value={form.language_code}
                    onChange={(e) => setForm({ ...form, language_code: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="fiction">Художественный</option>
                    <option value="non_fiction">Научно-популярный</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сложность</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="easy">Лёгкий</option>
                    <option value="medium">Средний</option>
                    <option value="hard">Сложный</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="w-4 h-4 text-indigo-600"
                />
                <label htmlFor="is_published" className="text-sm text-gray-700">
                  Опубликовать
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {saving ? 'Сохраняем...' : editingId ? 'Сохранить изменения' : 'Добавить текст'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Список текстов */}
        <div className="bg-white rounded-xl shadow-sm">
          {texts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Нет текстов. Добавьте первый!</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {texts.map((text) => (
                <div key={text.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">{text.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        text.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {text.isPublished ? 'Опубликован' : 'Черновик'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{text.content}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      <span>{text.lengthChars} симв.</span>
                      <span>{text.category === 'fiction' ? 'Художественный' : 'Научно-популярный'}</span>
                      <span>{text.difficulty === 'easy' ? 'Лёгкий' : text.difficulty === 'medium' ? 'Средний' : 'Сложный'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => togglePublish(text.id, text.isPublished)}
                      className={`text-xs px-3 py-1 rounded-lg transition ${
                        text.isPublished
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                      }`}
                    >
                      {text.isPublished ? 'Снять' : 'Опубликовать'}
                    </button>
                    <button
                      onClick={() => handleEdit(text)}
                      className="text-xs px-3 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(text.id, text.title)}
                      className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}