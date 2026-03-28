import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import https from 'https';
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
    'prisma',
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

  if (answers.components.includes('ios')) {
    await generateIOS(projectPath, answers, latestVersions);
  }

  if (answers.components.includes('android')) {
    await generateAndroid(projectPath, answers, latestVersions);
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
      prisma: latestVersions['prisma'] || '^7.0.0',
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
COPY prisma ./prisma
RUN npm install

RUN npx prisma generate || true

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev

RUN npx prisma generate || true

COPY --from=builder /app/dist ./dist

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
      types: ['node'],
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
    exclude: ['node_modules', 'dist', 'prisma.config.js'],
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

  // Prisma schema - Prisma 7 compatible (no url in schema)
  const prismaSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
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

  // Create prisma.config.ts for Prisma 7 datasource configuration
  const prismaConfig = `export default {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};
`;

  await fs.writeFile(path.join(backendDir, 'prisma.config.js'), prismaConfig);

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
      target: 'ES2020',
      lib: ['dom', 'dom.iterable', 'esnext'],
      jsx: 'preserve',
      module: 'esnext',
      moduleResolution: 'bundler',
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
      target: 'ES2020',
      lib: ['dom', 'dom.iterable', 'esnext'],
      jsx: 'preserve',
      module: 'esnext',
      moduleResolution: 'bundler',
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

async function generateIOS(projectPath, answers, latestVersions = {}) {
  const iosDir = path.join(projectPath, 'ios');
  await fs.ensureDir(iosDir);

  // Create Fastfile for fastlane
  const fastlaneDir = path.join(iosDir, 'fastlane');
  await fs.ensureDir(fastlaneDir);

  const fastfile = `default_platform(:ios)

platform :ios do
  desc "Build the iOS app"
  lane :build do
    build_app(
      workspace: "${answers.projectName}.xcworkspace",
      scheme: "${answers.projectName}",
      configuration: "Release",
      derived_data_path: "build",
      destination: "generic/platform=iOS",
      export_method: "ad-hoc"
    )
  end

  desc "Run tests"
  lane :test do
    run_tests(
      workspace: "${answers.projectName}.xcworkspace",
      scheme: "${answers.projectName}",
      devices: ["iPhone 15"]
    )
  end

  desc "Build and upload to TestFlight"
  lane :beta do
    build_app(
      workspace: "${answers.projectName}.xcworkspace",
      scheme: "${answers.projectName}",
      export_method: "app-store"
    )

    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end
end
`;

  await fs.writeFile(path.join(fastlaneDir, 'Fastfile'), fastfile);

  // Create Appfile for fastlane configuration
  const appfile = `app_identifier "com.eazyclaw.${answers.projectName.replace(/-/g, '')}"
apple_id "${answers.projectName}@eazyclaw.app"
team_id "XXXXXXXXXX"  # Update with your Apple Team ID
`;

  await fs.writeFile(path.join(fastlaneDir, 'Appfile'), appfile);

  // Create .gitignore for iOS
  const gitignore = `# Xcode
*.pbxproj
*.xcodeproj/
*.xcworkspace/
build/
DerivedData/
*.hmap
*.ipa
*.dSYM.zip
*.dSYM

# CocoaPods
Pods/
Podfile.lock

# Fastlane
fastlane/report.xml
fastlane/Preview.html
fastlane/.env
fastlane/.env.default

# iOS / macOS
.DS_Store
*.swiftpm
*.playground

# Certificates and keys
fastlane/certs
fastlane/keychain.db
`;

  await fs.writeFile(path.join(iosDir, '.gitignore'), gitignore);

  // Create README for iOS setup
  const readme = `# iOS App - ${answers.projectName}

## Setup

### Prerequisites
- Xcode 15+
- CocoaPods
- fastlane

### Installation

\`\`\`bash
# Install CocoaPods dependencies
pod install

# Install fastlane
sudo gem install fastlane
\`\`\`

## Development

### Running the app
1. Open \`${answers.projectName}.xcworkspace\` in Xcode
2. Select target device/simulator
3. Press Cmd+R to run

## Fastlane Lanes

### Build
\`\`\`bash
fastlane ios build
\`\`\`

### Run Tests
\`\`\`bash
fastlane ios test
\`\`\`

### Upload to TestFlight
\`\`\`bash
fastlane ios beta
\`\`\`

## Configuration

### Before first build:
1. Update \`fastlane/Appfile\` with:
   - Your app bundle identifier
   - Apple ID / Developer account email
   - Team ID from Apple Developer account

2. Set up certificates and provisioning profiles using fastlane match:
\`\`\`bash
fastlane match init
fastlane match appstore
\`\`\`

## Notes
- Default configuration uses App Store export method for TestFlight uploads
- Build artifacts are stored in the \`build/\` directory
- Ensure you have the proper Apple Developer account access
`;

  await fs.writeFile(path.join(iosDir, 'README.md'), readme);

  // Create a basic src structure placeholder
  await fs.ensureDir(path.join(iosDir, 'src'));
  const srcReadme = `# iOS Source Code

Place your Swift source code here after setting up the Xcode project.

## Quick Setup

1. Create new Xcode project:
   \`\`\`bash
   cd ios
   open .
   \`\`\`

2. In Xcode, select File → New → Project
3. Choose iOS → App
4. Name: ${answers.projectName}
5. Save in the \`ios\` folder

Then set up CocoaPods:
\`\`\`bash
cd ios
pod init
# Edit Podfile with your dependencies
pod install
\`\`\`
`;

  await fs.writeFile(path.join(iosDir, 'src', 'README.md'), srcReadme);
}

async function generateAndroid(projectPath, answers, latestVersions = {}) {
  const androidDir = path.join(projectPath, 'android');
  await fs.ensureDir(androidDir);

  // Create basic Android structure
  const srcDir = path.join(androidDir, 'app', 'src', 'main');
  await fs.ensureDir(srcDir);

  // Create gradle files directory
  const gradleDir = path.join(androidDir, 'gradle');
  await fs.ensureDir(gradleDir);

  // Create build.gradle.kts (root)
  const rootBuildGradle = `plugins {
    id("com.android.application") version "8.1.0" apply false
    id("com.android.library") version "8.1.0" apply false
    kotlin("android") version "1.9.0" apply false
}

task("clean") {
    delete(rootProject.buildDir)
}
`;

  await fs.writeFile(path.join(androidDir, 'build.gradle.kts'), rootBuildGradle);

  // Create .gitignore for Android
  const gitignore = `# Gradle
.gradle/
build/
*.apk
*.aar

# Android Studio
.idea/
*.iml
*.iws
*.ipr
local.properties

# Kotlin
*.kt

# Misc
.DS_Store
`;

  await fs.writeFile(path.join(androidDir, '.gitignore'), gitignore);

  // Create README for Android setup
  const readme = `# Android App - ${answers.projectName}

## Setup

### Prerequisites
- Android Studio 2024.1 or higher
- Java Development Kit (JDK) 17+
- Android SDK 34+

## Development

### Opening the project
1. Open Android Studio
2. Select "Open an Existing Project"
3. Select the \`android\` folder
4. Wait for Gradle sync to complete

### Running the app
1. Select a device or create an emulator
2. Click "Run 'app'" or press Shift+F10

## Building

### Debug APK
\`\`\`bash
./gradlew assembleDebug
\`\`\`

### Release APK
\`\`\`bash
./gradlew assembleRelease
\`\`\`

### Run Tests
\`\`\`bash
./gradlew test
\`\`\`

## Project Structure

\`\`\`
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── kotlin/
│   │   │   ├── java/
│   │   │   └── AndroidManifest.xml
│   │   ├── test/
│   │   └── androidTest/
│   └── build.gradle.kts
├── gradle/
├── build.gradle.kts
└── settings.gradle.kts
\`\`\`

## Configuration

Update \`local.properties\` with your local setup:
\`\`\`properties
sdk.dir=/path/to/Android/sdk
\`\`\`

## Notes
- Ensure Android Studio is properly configured with SDK
- API level 28+ is recommended for compatibility
- Use \`./gradlew clean\` if you encounter build issues
`;

  await fs.writeFile(path.join(androidDir, 'README.md'), readme);

  // Create app src directory structure
  await fs.ensureDir(path.join(srcDir, 'kotlin', `com/eazyclaw/${answers.projectName.replace(/-/g, '')}`));
  await fs.ensureDir(path.join(srcDir, 'res', 'layout'));
  await fs.ensureDir(path.join(srcDir, 'res', 'values'));
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

## Dependencies & Package Management

### Primary Information Source: Context7

**Always check Context7 for versions and documentation before working with packages:**

| Package | Context7 Link |
| --- | --- |
| Next.js | [context7.com/vercel/next.js](https://context7.com/vercel/next.js) |
| NestJS | [context7.com/nestjs/docs.nestjs.com](https://context7.com/nestjs/docs.nestjs.com) |
| Prisma | [context7.com/prisma/web](https://context7.com/prisma/web) |
| MUI-X | [context7.com/mui/mui-x](https://context7.com/mui/mui-x) |
| Claude Code | [context7.com/anthropics/claude-code](https://context7.com/anthropics/claude-code) |

### Installation Workflow

Before installing or updating ANY package:

1. Check latest version: \`npx ctx7 skills search <package-name>\`
2. Visit the Context7 link above for your package
3. Review code examples and best practices
4. Install with specific version: \`npm install <package>@<version>\`

**Example:**

\`\`\`bash
npx ctx7 skills search prisma
# → Check https://context7.com/prisma/web for latest version
npm install prisma@<latest-version>
\`\`\`

### Why Context7?

- Always up-to-date (updated within days)
- High trust scores (8-10/10)
- Includes code snippets and examples
- Aggregates official documentation
- Prevents using outdated/vulnerable versions

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

function makeApiRequest(method, host, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path: path,
      method: method,
      headers: {
        'PRIVATE-TOKEN': token,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

export async function createRepository(answers) {
  const projectPath = path.join(process.cwd(), answers.projectName);

  // Initialize git first
  execSync('git init', { cwd: projectPath, stdio: 'pipe' });
  execSync('git config user.email "ai@eazyclaw.app"', { cwd: projectPath, stdio: 'pipe' });
  execSync('git config user.name "AI Bot"', { cwd: projectPath, stdio: 'pipe' });

  // Rename branch to main if it's master
  try {
    execSync('git branch -M main', { cwd: projectPath, stdio: 'pipe' });
  } catch (e) {
    // Ignore if main already exists
  }

  execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'pipe' });

  if (answers.gitPlatform === 'GitLab') {
    // Create GitLab repository via API
    const repoData = {
      name: answers.projectName,
      visibility: 'private',
      description: `${answers.projectName} - TikTok Template`,
      issues_enabled: true,
      wiki_enabled: false,
    };

    const repo = await makeApiRequest('POST', 'gitlab.com', '/api/v4/projects', answers.gitToken, repoData);

    // Add remote and push
    execSync(`git remote add origin ${repo.http_url_to_repo}`, { cwd: projectPath, stdio: 'pipe' });
    execSync(`git push -u origin main`, {
      cwd: projectPath,
      stdio: 'pipe',
      env: {
        ...process.env,
        GIT_ASKPASS: 'echo',
        GIT_ASKPASS_RESULT: answers.gitToken,
      },
    });
  } else if (answers.gitPlatform === 'GitHub') {
    // Use GitHub CLI
    execSync(`gh repo create ${answers.projectName} --private --source=. --remote origin --push`, {
      cwd: projectPath,
      stdio: 'pipe',
      env: {
        ...process.env,
        GH_TOKEN: answers.gitToken,
      },
    });
  }
}
