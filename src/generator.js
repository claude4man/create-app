import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { generateDockerCompose } from './templates/docker-compose.js';
import { generatePackageJson } from './templates/package-json.js';
import { generateGitHubActions } from './templates/github-actions.js';
import { generateREADME } from './templates/readme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, 'templates');

async function getLatestVersions(packages) {
  const versions = {};

  console.log('\n📦 Fetching latest package versions from npm...\n');

  for (const pkg of packages) {
    try {
      const version = execSync(`npm view ${pkg} version`, { encoding: 'utf-8' }).trim();
      versions[pkg] = `^${version}`;
      console.log(`  ✓ ${pkg}: ${versions[pkg]}`);
    } catch (error) {
      console.log(`  ⚠ ${pkg}: Could not fetch, using default`);
    }
  }

  console.log();
  return versions;
}

export async function generateProject(answers, cliDir) {
  const projectPath = path.join(process.cwd(), answers.projectName);

  // Fetch latest versions
  const packagesToCheck = [
    'next',
    'react',
    'react-dom',
    'axios',
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/platform-express',
    '@prisma/client',
    '@mui/material',
    '@mui/icons-material',
    '@emotion/react',
    '@emotion/styled',
    'class-validator',
    'class-transformer',
    'typescript',
    'eslint',
  ];

  const latestVersions = await getLatestVersions(packagesToCheck);

  // Create project directory
  await fs.ensureDir(projectPath);

  // Copy base template
  await copyBaseTemplate(projectPath, answers);

  // Generate component-specific files
  if (answers.components.includes('backend')) {
    await generateBackend(projectPath, answers, latestVersions);
  }

  if (answers.components.includes('frontend')) {
    await generateFrontend(projectPath, answers, latestVersions);
  }

  if (answers.components.includes('admin')) {
    await generateAdmin(projectPath, answers, latestVersions);
  }

  if (answers.components.includes('landing')) {
    await generateLanding(projectPath, answers, latestVersions);
  }

  // Generate Docker and CI/CD files
  const dockerCompose = generateDockerCompose(answers);
  await fs.writeFile(path.join(projectPath, 'docker-compose.yml'), dockerCompose);

  const rootPackage = generatePackageJson(answers);
  await fs.writeFile(path.join(projectPath, 'package.json'), rootPackage);

  const readme = generateREADME(answers);
  await fs.writeFile(path.join(projectPath, 'README.md'), readme);

  // Generate GitHub Actions workflows
  await generateGitHubActions(projectPath, answers);

  // Generate CLAUDE.md
  await generateCLAUDEmd(projectPath, answers);

  // Generate .gitignore
  await generateGitignore(projectPath);

  // Generate .env.example
  await generateEnvExample(projectPath, answers);
}

async function copyBaseTemplate(projectPath, answers) {
  const baseFiles = ['.gitkeep'];

  for (const file of baseFiles) {
    const srcFile = path.join(TEMPLATES_DIR, 'base', file);
    const destFile = path.join(projectPath, file);
    if (await fs.pathExists(srcFile)) {
      await fs.copy(srcFile, destFile);
    }
  }

  // Create basic directories
  await fs.ensureDir(path.join(projectPath, '.github', 'workflows'));
}

async function generateBackend(projectPath, answers, latestVersions = {}) {
  const backendDir = path.join(projectPath, 'backend');
  await fs.ensureDir(backendDir);

  const packageJson = {
    name: `${answers.projectName}-backend`,
    version: '1.0.0',
    description: 'NestJS Backend',
    main: 'dist/main.js',
    scripts: {
      dev: 'nest start --watch',
      build: 'nest build',
      start: 'node dist/main',
      'db:migrate': 'npx prisma migrate deploy',
    },
    dependencies: {
      '@nestjs/common': latestVersions['@nestjs/common'] || '^10.0.0',
      '@nestjs/core': latestVersions['@nestjs/core'] || '^10.0.0',
      '@nestjs/platform-express': latestVersions['@nestjs/platform-express'] || '^10.0.0',
      '@prisma/client': latestVersions['@prisma/client'] || '^5.0.0',
      'class-validator': latestVersions['class-validator'] || '^0.14.0',
      'class-transformer': latestVersions['class-transformer'] || '^0.5.1',
    },
    devDependencies: {
      '@nestjs/cli': latestVersions['@nestjs/common']?.replace(/\d+\.\d+\.\d+/, (match) => {
        const parts = match.split('.');
        return `${parts[0]}.0.0`;
      }) || '^10.0.0',
      '@types/node': '^20.0.0',
      typescript: latestVersions['typescript'] || '^5.0.0',
      'ts-loader': '^9.0.0',
    },
  };

  await fs.writeFile(
    path.join(backendDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create Dockerfile
  const dockerfile = `FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
`;

  await fs.writeFile(path.join(backendDir, 'Dockerfile'), dockerfile);

  // Create src directory
  const srcDir = path.join(backendDir, 'src');
  await fs.ensureDir(srcDir);

  // Create main.ts
  const mainTs = `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3001);
  console.log(\`Server running on port \${process.env.PORT || 3001}\`);
}

bootstrap();
`;

  await fs.writeFile(path.join(srcDir, 'main.ts'), mainTs);

  // Create app.module.ts
  const appModule = `import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
`;

  await fs.writeFile(path.join(srcDir, 'app.module.ts'), appModule);

  // Create prisma folder
  const prismaDir = path.join(srcDir, 'prisma');
  await fs.ensureDir(prismaDir);

  const prismaModule = `import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
`;

  await fs.writeFile(path.join(prismaDir, 'prisma.module.ts'), prismaModule);

  const prismaService = `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
`;

  await fs.writeFile(path.join(prismaDir, 'prisma.service.ts'), prismaService);

  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      module: 'commonjs',
      target: 'ES2021',
      lib: ['ES2021'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
  };

  await fs.writeFile(
    path.join(backendDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );

  // Create nest-cli.json
  const nestCli = {
    collection: '@nestjs/schematics',
    sourceRoot: 'src',
  };

  await fs.writeFile(
    path.join(backendDir, 'nest-cli.json'),
    JSON.stringify(nestCli, null, 2)
  );

  // Create .env
  const backendPort = parseInt(answers.backendPort) || 6501;
  let envFile = `NODE_ENV=development
PORT=${backendPort}
`;

  if (answers.includeDatabase) {
    envFile += `DATABASE_URL="postgresql://postgres:postgres@postgres:5432/${answers.projectName}"\n`;
  }

  await fs.writeFile(path.join(backendDir, '.env'), envFile);

  // Prisma schema
  const prismaSchema = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;

  await fs.ensureDir(path.join(backendDir, 'prisma'));
  await fs.writeFile(path.join(backendDir, 'prisma', 'schema.prisma'), prismaSchema);

  // Create .prisma/.gitkeep
  await fs.ensureDir(path.join(backendDir, '.prisma'));
  await fs.writeFile(path.join(backendDir, '.prisma', '.gitkeep'), '');
}

async function generateFrontend(projectPath, answers, latestVersions = {}) {
  const frontendDir = path.join(projectPath, 'frontend');
  await fs.ensureDir(frontendDir);

  const nextVersion = latestVersions['next'] || '^14.0.0';

  const packageJson = {
    name: `${answers.projectName}-frontend`,
    version: '1.0.0',
    description: 'Next.js Frontend',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    dependencies: {
      next: nextVersion,
      react: latestVersions['react'] || '^18.0.0',
      'react-dom': latestVersions['react-dom'] || '^18.0.0',
      axios: latestVersions['axios'] || '^1.6.0',
    },
    devDependencies: {
      typescript: latestVersions['typescript'] || '^5.0.0',
      '@types/node': '^20.0.0',
      '@types/react': latestVersions['@types/react'] || '^18.0.0',
      eslint: latestVersions['eslint'] || '^8.0.0',
      'eslint-config-next': nextVersion.replace(/\d+\.\d+\.\d+/, (match) => {
        const parts = match.split('.');
        return `${parts[0]}.0.0`;
      }),
    },
  };

  await fs.writeFile(
    path.join(frontendDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create Dockerfile
  const dockerfile = `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`;

  await fs.writeFile(path.join(frontendDir, 'Dockerfile'), dockerfile);

  // Create .env
  const backendPort = parseInt(answers.backendPort) || 6501;
  const envFile = `NEXT_PUBLIC_API_URL=http://localhost:${backendPort}
`;

  await fs.writeFile(path.join(frontendDir, '.env.local'), envFile);

  // Create next.config.js
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
`;

  await fs.writeFile(path.join(frontendDir, 'next.config.js'), nextConfig);

  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'es5',
      lib: ['dom', 'dom.iterable', 'esnext'],
      jsx: 'preserve',
      module: 'esnext',
      moduleResolution: 'node',
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      isolatedModules: true,
      incremental: true,
      paths: {
        '@/*': ['./*'],
      },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules'],
  };

  await fs.writeFile(
    path.join(frontendDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );

  // Create src/app
  const appDir = path.join(frontendDir, 'src', 'app');
  await fs.ensureDir(appDir);

  const layoutTsx = `export const metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`;

  await fs.writeFile(path.join(appDir, 'layout.tsx'), layoutTsx);

  const pageTsx = `export default function Home() {
  return (
    <main>
      <h1>Welcome to ${answers.projectName}</h1>
    </main>
  )
}
`;

  await fs.writeFile(path.join(appDir, 'page.tsx'), pageTsx);
}

async function generateAdmin(projectPath, answers, latestVersions = {}) {
  const adminDir = path.join(projectPath, 'admin');
  await fs.ensureDir(adminDir);

  const nextVersion = latestVersions['next'] || '^14.0.0';

  const packageJson = {
    name: `${answers.projectName}-admin`,
    version: '1.0.0',
    description: 'Admin Panel (Next.js + MUI)',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      next: nextVersion,
      react: latestVersions['react'] || '^18.0.0',
      'react-dom': latestVersions['react-dom'] || '^18.0.0',
      '@mui/material': latestVersions['@mui/material'] || '^5.14.0',
      '@mui/icons-material': latestVersions['@mui/icons-material'] || '^5.14.0',
      '@emotion/react': latestVersions['@emotion/react'] || '^11.0.0',
      '@emotion/styled': latestVersions['@emotion/styled'] || '^11.0.0',
      axios: latestVersions['axios'] || '^1.6.0',
    },
    devDependencies: {
      typescript: latestVersions['typescript'] || '^5.0.0',
      '@types/react': latestVersions['@types/react'] || '^18.0.0',
    },
  };

  await fs.writeFile(
    path.join(adminDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create Dockerfile
  const dockerfile = `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`;

  await fs.writeFile(path.join(adminDir, 'Dockerfile'), dockerfile);

  // Create .env
  const backendPort = parseInt(answers.backendPort) || 6501;
  const envFile = `NEXT_PUBLIC_API_URL=http://localhost:${backendPort}
`;

  await fs.writeFile(path.join(adminDir, '.env.local'), envFile);

  // Create next.config.js
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
`;

  await fs.writeFile(path.join(adminDir, 'next.config.js'), nextConfig);

  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'es5',
      lib: ['dom', 'dom.iterable', 'esnext'],
      jsx: 'preserve',
      module: 'esnext',
      moduleResolution: 'node',
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      isolatedModules: true,
      incremental: true,
      paths: {
        '@/*': ['./*'],
      },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules'],
  };

  await fs.writeFile(
    path.join(adminDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );

  const appDir = path.join(adminDir, 'src', 'app');
  await fs.ensureDir(appDir);

  const layoutTsx = `export const metadata = {
  title: 'Admin Panel',
  description: 'Admin Panel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`;

  await fs.writeFile(path.join(appDir, 'layout.tsx'), layoutTsx);

  const pageTsx = `export default function AdminHome() {
  return (
    <main>
      <h1>Admin Panel - ${answers.projectName}</h1>
    </main>
  )
}
`;

  await fs.writeFile(path.join(appDir, 'page.tsx'), pageTsx);
}

async function generateLanding(projectPath, answers, latestVersions = {}) {
  const landingDir = path.join(projectPath, 'landing');
  await fs.ensureDir(landingDir);

  const packageJson = {
    name: `${answers.projectName}-landing`,
    version: '1.0.0',
    description: 'Landing Page',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      next: latestVersions['next'] || '^14.0.0',
      react: latestVersions['react'] || '^18.0.0',
      'react-dom': latestVersions['react-dom'] || '^18.0.0',
    },
  };

  await fs.writeFile(
    path.join(landingDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create Dockerfile
  const dockerfile = `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`;

  await fs.writeFile(path.join(landingDir, 'Dockerfile'), dockerfile);

  await fs.ensureDir(path.join(landingDir, 'src', 'app'));
}

async function generateCLAUDEmd(projectPath, answers) {
  const claude = `# ${answers.projectName}

## Tech Stack

- **Backend:** NestJS
- **Frontend:** Next.js
- **Database:** PostgreSQL with Prisma ORM
- **Admin Panel:** Material-UI (MUI) theme
- **Infrastructure:** Docker

## Deployment

**Domain:** ${answers.subdomain}.eazyclaw.app
**GitHub:** github.com/${answers.githubUser}/${answers.projectName}

## Components

${answers.components.map((c) => `- ✅ ${c}`).join('\n')}

## Key Constraints

- All features to \`main\` require approval before merge
- Prisma migrations run before Docker startup
- Private repository

## Environment Variables

Copy \`.env.example\` to \`.env.local\` and fill in your values.
`;

  await fs.writeFile(path.join(projectPath, 'CLAUDE.md'), claude);
}

async function generateGitignore(projectPath) {
  const gitignore = `# Dependencies
node_modules
/.pnp
.pnp.js

# Environment variables
.env
.env.local
.env.*.local

# Build
/dist
/.next
/out
/build

# IDE
.vscode
.idea
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Prisma
prisma/migrations/

# Docker
.docker-compose.override.yml
`;

  await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
}

async function generateEnvExample(projectPath, answers) {
  const backendPort = parseInt(answers.backendPort) || 6501;
  const adminPort = parseInt(answers.adminPort) || 6502;
  const dbPort = parseInt(answers.dbPort) || 6503;

  let env = '';

  if (answers.includeDatabase) {
    env += `# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=${dbPort}

`;
  }

  env += `# Backend
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:${backendPort}
`;

  if (answers.components.includes('admin')) {
    env += `
# Admin
NEXT_PUBLIC_ADMIN_URL=http://localhost:${adminPort}
`;
  }

  await fs.writeFile(path.join(projectPath, '.env.example'), env);
}
