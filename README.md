# create-app

🚀 **CLI для быстрого создания современных приложений** с NestJS, Next.js, Docker и GitHub Actions.

Создает готовый к запуску проект с:
- ✅ Docker Compose конфигурацией
- ✅ GitHub Actions CI/CD пайплайнами
- ✅ Автоматической загрузкой последних версий пакетов из npm
- ✅ Правильной структурой TypeScript проектов
- ✅ Поддержкой опциональной базы данных PostgreSQL

## Установка

### Через npm (когда будет опубликовано)
```bash
npm install -g create-app
```

### Локальная установка (разработка)
```bash
git clone https://github.com/claude4man/create-app
cd create-app
npm install
npm link
```

## Использование

```bash
create-app
```

### Интерактивные вопросы

1. **Имя проекта** - Строчные буквы и дефисы (например: `my-awesome-app`)
2. **Поддомен** - Для развертывания (например: `my-app`)
3. **Компоненты** - Выбери что нужно:
   - ✅ Backend (NestJS)
   - ✅ Frontend (Next.js)
   - ✅ Admin Panel (Next.js + MUI)
   - ✅ Landing Page
   - ✅ iOS App
   - ✅ Android App

4. **PostgreSQL?** - Включить базу данных? (Да/Нет)
5. **GitHub Username** - Для ссылки на репозиторий
6. **Frontend Port** - Порт для фронтенда (default: 6500)
7. **Backend Port** - Порт для API (если выбран backend, default: 6501)
8. **Admin Port** - Порт для админки (если выбран admin, default: 6502)
9. **Database Port** - Порт для БД (если выбрана, default: 6503)

## Пример использования

```bash
$ create-app
🎬 Create App

? Project name? my-startup-app
? Subdomain (for eazyclaw.app)? my-startup
? What do you want to include? backend, frontend, admin
? Include PostgreSQL? Yes
? GitHub username? claude4man
? Frontend port? 6500
? Backend port? 6501
? Admin port? 6502
? Database port? 6503

✨ Generating project structure...
📦 Fetching latest package versions from npm...
✓ next: ^16.2.1
✓ react: ^19.2.4
✓ @nestjs/core: ^11.1.17
✓ @prisma/client: ^7.6.0
... и еще 12 пакетов

✅ Project created successfully!

Next steps:
  cd my-startup-app
  git init
  git add .
  git commit -m "Initial commit"
  gh repo create my-startup-app --private --source=. --push
```

## Что генерируется?

### Структура проекта
```
my-startup-app/
├── backend/              # NestJS API
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/             # Next.js фронтенд
│   ├── src/app/
│   ├── package.json
│   └── Dockerfile
├── admin/                # MUI админ-панель
│   ├── src/app/
│   ├── package.json
│   └── Dockerfile
├── .github/
│   └── workflows/
│       ├── deploy-production.yml   # main → prod
│       └── deploy-staging.yml      # dev → staging
├── docker-compose.yml    # Оркестрация всех сервисов
├── package.json          # Корневой пакет с workspaces
├── .env.example          # Шаблон переменных
├── CLAUDE.md             # Документация проекта
└── README.md
```

### Файлы конфигурации
- `docker-compose.yml` - Docker Compose с условным включением PostgreSQL
- `.env.example` - Шаблон переменных окружения
- `package.json` - npm workspaces для управления несколькими пакетами
- `.github/workflows/` - GitHub Actions для автоматического развертывания

## Фишки

### 🐳 Docker готовый
- Многостадийные сборки (multi-stage builds) для оптимальных образов
- Автоматические миграции Prisma при запуске
- Health checks для сервисов
- Правильная настройка томов (volumes)

### 🚀 CI/CD из коробки
- Автоматическое развертывание на VPS (SSH)
- main → production, dev → staging
- Условное выполнение миграций БД

### 📦 Всегда актуальные пакеты
- Автоматическая загрузка последних версий npm
- Никогда не будут устаревшие зависимости
- Поддержка npm ^версий для совместимости

### ⚙️ Smart конфигурация
- PostgreSQL включается только если выбрана
- Backend зависит от БД только если она есть
- Каждый сервис может использовать свой порт
- Правильные .env файлы для каждого компонента

### 🔧 Готовые скрипты
```bash
npm run dev      # Запустить все в Docker
npm run build    # Собрать Docker образы
npm run down     # Остановить контейнеры
npm run db:migrate  # Запустить миграции
npm run db:studio   # Открыть Prisma Studio
```

## Развертывание

### На собственном VPS
1. Добавь GitHub Secrets в репозиторий:
   - `SSH_PRIVATE_KEY` - Приватный SSH ключ
   - `VPS_HOST` - IP сервера
   - `VPS_USER` - Пользователь на сервере (например `root`)

2. Создай директории на сервере:
   ```bash
   mkdir -p /var/www/my-startup-app
   ```

3. Пуши на `main` - развертывается в production
4. Пуши на `dev` - развертывается в staging

### На VPS eazyclaw.app
Если используешь мой VPS:
- VPS_HOST: `45.88.223.97`
- VPS_USER: `root`
- Domain: `https://my-startup.eazyclaw.app`

## Требования

- **Node.js** - 16.0.0 или выше
- **npm** - 8.0.0 или выше
- **Docker** (для локальной разработки)
- **GitHub CLI** (для создания репо - опционально)

## Развитие

Хочешь добавить свою функцию? Лови:

1. Fork репозиторий
2. Создай ветку (`git checkout -b feature/amazing-feature`)
3. Коммитни изменения (`git commit -m 'Add amazing feature'`)
4. Запуши (`git push origin feature/amazing-feature`)
5. Открой Pull Request

## Лицензия

MIT © 2026 - Свободно используй в личных и коммерческих проектах.

## Помощь & Вопросы

Если что-то не работает:
1. Проверь, что установлены Node.js 16+ и npm 8+
2. Удали `node_modules` и переустанови: `npm install`
3. Создай Issue на GitHub с подробным описанием
4. Посмотри примеры в `/examples` (если добавим)

## Статус

- ✅ NestJS + Prisma backend
- ✅ Next.js frontend
- ✅ MUI admin panel
- ✅ Docker Compose
- ✅ GitHub Actions CI/CD
- ✅ Автоматическая загрузка версий пакетов
- 🚧 Публикация на npm (скоро)
- 🚧 Шаблоны для мобильных приложений
- 🚧 E2E тесты

## Автор

Создано для быстрого старта новых проектов.

---

**Быстрый старт:**
```bash
npx create-app
# или
npm install -g create-app && create-app
```
