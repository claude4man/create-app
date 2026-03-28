export function generatePackageJson(answers) {
  const scripts = {
    'install:all': 'npm install',
    dev: 'docker-compose up',
    build: 'docker-compose build',
    down: 'docker-compose down',
  };

  if (answers.components.includes('backend')) {
    scripts['db:migrate'] = 'cd backend && npx prisma migrate deploy';
    scripts['db:studio'] = 'cd backend && npx prisma studio';
  }

  return JSON.stringify(
    {
      name: answers.projectName,
      version: '1.0.0',
      description: 'TikTok Template Project',
      private: true,
      scripts,
      workspaces: answers.components
        .filter((c) => ['backend', 'frontend', 'admin', 'landing'].includes(c))
        .map((c) => `./${c}`),
    },
    null,
    2
  );
}
