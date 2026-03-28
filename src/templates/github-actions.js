import fs from 'fs-extra';
import path from 'path';

export async function generateGitHubActions(projectPath, answers) {
  const workflowsDir = path.join(projectPath, '.github', 'workflows');
  await fs.ensureDir(workflowsDir);

  const deployProd = `name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: \${{ secrets.VPS_HOST }}
          username: \${{ secrets.VPS_USER }}
          key: \${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/${answers.projectName}
            git pull origin main

            # Run migrations if backend exists
            ${answers.components.includes('backend') ? `npx prisma migrate deploy\n            ` : ''}
            docker-compose down
            docker-compose up -d

            echo "✅ Production deployment complete"
`;

  await fs.writeFile(path.join(workflowsDir, 'deploy-production.yml'), deployProd);

  const deployStagingScript = `name: Deploy to Staging

on:
  push:
    branches:
      - dev

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: \${{ secrets.VPS_HOST }}
          username: \${{ secrets.VPS_USER }}
          key: \${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/${answers.projectName}-staging
            git pull origin dev

            # Run migrations if backend exists
            ${answers.components.includes('backend') ? `npx prisma migrate deploy\n            ` : ''}
            docker-compose down
            docker-compose up -d

            echo "✅ Staging deployment complete"
`;

  await fs.writeFile(path.join(workflowsDir, 'deploy-staging.yml'), deployStagingScript);
}
