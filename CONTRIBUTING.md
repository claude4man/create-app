# Внесение вклада в create-app

Спасибо, что захотел помочь! Вот как ты можешь участвовать в развитии проекта.

## Как начать?

1. **Fork репозиторий** на GitHub
2. **Клонируй свой fork:**
   ```bash
   git clone https://github.com/ТВ_USERNAME/create-app
   cd create-app
   ```

3. **Создай ветку для своего изменения:**
   ```bash
   git checkout -b feature/amazing-feature
   # или для баг-фиксов:
   git checkout -b fix/bug-description
   ```

4. **Установи зависимости:**
   ```bash
   npm install
   npm link
   ```

## Разработка

### Структура проекта
```
.
├── index.js                 # Главный CLI файл
├── src/
│   ├── generator.js         # Основная логика генерации
│   └── templates/           # Шаблоны для файлов
│       ├── docker-compose.js
│       ├── github-actions.js
│       ├── package-json.js
│       └── readme.js
├── package.json
└── README.md
```

### Тестирование локально

```bash
# Переустанови после изменений
npm install

# Переслинкуй глобально
npm link

# Создай тестовый проект
cd /tmp
create-app

# Заполни промпты и проверь результат
```

### Что проверять при изменениях

- ✅ Все промпты работают корректно
- ✅ Проект генерируется без ошибок
- ✅ docker-compose.yml валидный YAML
- ✅ Все .env файлы содержат правильные значения
- ✅ GitHub workflows синтаксически верны
- ✅ Версии пакетов загружаются с npm

## Что можно улучшить?

Вот идеи для PR:

### 🆕 Новые функции
- [ ] Поддержка других фреймворков (FastAPI, Django, etc.)
- [ ] Шаблоны для монорепо структур
- [ ] Поддержка Kubernetes конфигов
- [ ] Интеграция с Sentry/logging
- [ ] E2E тесты скелеты
- [ ] GraphQL поддержка для backend
- [ ] Tailwind CSS для фронтенда
- [ ] Stripe/платежи интеграция

### 🐛 Баг-фиксы
- Если нашел баг - создай Issue с описанием и шагами воспроизведения

### 📚 Документация
- Переводы README на другие языки
- Примеры использования (examples/)
- Видеотутториалы

### ⚡ Оптимизация
- Быстрая загрузка версий пакетов
- Кеширование результатов npm

## Правила коммитов

Используй понятные названия коммитов:

```bash
# Новая функция
git commit -m "feat: добавил поддержку GraphQL"

# Баг-фикс
git commit -m "fix: исправил ошибку при выборе компонентов"

# Документация
git commit -m "docs: обновил README с примерами"

# Рефактор
git commit -m "refactor: переделал логику загрузки версий"

# Тесты
git commit -m "test: добавил тесты для docker-compose генератора"
```

## Отправка Pull Request

1. **Убедись, что всё работает:**
   ```bash
   npm install
   npm link
   create-app  # тестовый запуск
   ```

2. **Создай PR с описанием:**
   - Что изменилось?
   - Почему это нужно?
   - Как это тестировать?

3. **Примеры PR:**
   - ✅ "Add support for GraphQL backend templates"
   - ✅ "Fix port collision when multiple services on same port"
   - ❌ "Fixed stuff" (не информативно)

## Code Style

- **JavaScript** - используем стандартный стиль
- **Переменные** - camelCase для переменных, UPPER_CASE для констант
- **Функции** - async/await вместо callbacks
- **Комментарии** - объясняй "зачем", а не "что"

Пример:
```javascript
// ✅ ХОРОШО
async function getLatestVersions(packages) {
  // Загружаем версии параллельно для ускорения
  const versions = await Promise.all(
    packages.map(pkg => fetchVersion(pkg))
  );
  return versions;
}

// ❌ ПЛОХО
// Получаем версии
function getVersions(p) {
  let v = [];
  for (let i = 0; i < p.length; i++) {
    v.push(fetch(p[i]));
  }
  return v;
}
```

## Вопросы?

- 💬 Создай Discussion на GitHub
- 🐛 Обнаружил баг? Создай Issue
- 📧 Спроси в комментариях к PR

## Лицензия

Внося вклад, ты соглашаешься с MIT лицензией.

---

**Спасибо за помощь! 🚀**
