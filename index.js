#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateProject, createRepository } from './src/generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function showManualRepoSteps(answers) {
  const repoUrl =
    answers.gitPlatform === 'GitHub'
      ? `https://github.com/${answers.gitUser}/${answers.projectName}`
      : `https://gitlab.com/${answers.gitUser}/${answers.projectName}`;

  const command =
    answers.gitPlatform === 'GitHub'
      ? `gh repo create ${answers.projectName} --private --source=. --push`
      : `# Create on ${answers.gitPlatform} UI, then:\ngit remote add origin ${repoUrl}.git\ngit push -u origin main`;

  console.log(chalk.white(`  ${command}\n`));
}

async function main() {
  console.log(chalk.bold.cyan('\n🎬 Create App\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name?',
      default: 'my-tik-tok-app',
      validate: (input) => {
        if (/^[a-z0-9-]+$/.test(input)) return true;
        return 'Project name must be lowercase with hyphens only';
      },
    },
    {
      type: 'input',
      name: 'subdomain',
      message: 'Subdomain (for eazyclaw.app)?',
      default: (answers) => answers.projectName,
      validate: (input) => {
        if (/^[a-z0-9-]+$/.test(input)) return true;
        return 'Subdomain must be lowercase with hyphens only';
      },
    },
    {
      type: 'checkbox',
      name: 'components',
      message: 'What do you want to include?',
      choices: [
        { name: 'Backend (NestJS)', value: 'backend', checked: true },
        { name: 'Frontend (Next.js)', value: 'frontend', checked: true },
        { name: 'Admin Panel (MUI)', value: 'admin', checked: true },
        { name: 'Landing Page', value: 'landing', checked: false },
        { name: 'iOS App', value: 'ios', checked: false },
        { name: 'Android App', value: 'android', checked: false },
      ],
      validate: (input) => {
        if (input.length === 0) return 'Select at least one component';
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'includeDatabase',
      message: 'Include PostgreSQL?',
      default: true,
    },
    {
      type: 'list',
      name: 'gitPlatform',
      message: 'Choose platform for repository:',
      choices: ['GitHub', 'GitLab'],
      default: 'GitHub',
    },
    {
      type: 'input',
      name: 'gitUser',
      message: (answers) => {
        return answers.gitPlatform === 'GitHub' ? 'GitHub username?' : 'GitLab username/group?';
      },
      default: 'claude4man',
    },
    {
      type: 'password',
      name: 'gitToken',
      message: (answers) => {
        return answers.gitPlatform === 'GitHub' ? 'GitHub token (gh auth token)?' : 'GitLab token (Settings → Access Tokens)?';
      },
      mask: '*',
    },
  ]);

  // Ask for ports only for selected components
  const portPrompts = [
    {
      type: 'input',
      name: 'frontendPort',
      message: 'Frontend port?',
      default: '6500',
      validate: (input) => {
        const port = parseInt(input);
        if (port >= 1024 && port <= 65535) return true;
        return 'Port must be between 1024 and 65535';
      },
    },
  ];

  if (answers.components.includes('backend')) {
    portPrompts.push({
      type: 'input',
      name: 'backendPort',
      message: 'Backend port?',
      default: '6501',
      validate: (input) => {
        const port = parseInt(input);
        if (port >= 1024 && port <= 65535) return true;
        return 'Port must be between 1024 and 65535';
      },
    });
  }

  if (answers.components.includes('admin')) {
    portPrompts.push({
      type: 'input',
      name: 'adminPort',
      message: 'Admin panel port?',
      default: '6502',
      validate: (input) => {
        const port = parseInt(input);
        if (port >= 1024 && port <= 65535) return true;
        return 'Port must be between 1024 and 65535';
      },
    });
  }

  if (answers.includeDatabase) {
    portPrompts.push({
      type: 'input',
      name: 'dbPort',
      message: 'Database port?',
      default: '6503',
      validate: (input) => {
        const port = parseInt(input);
        if (port >= 1024 && port <= 65535) return true;
        return 'Port must be between 1024 and 65535';
      },
    });
  }

  const portAnswers = await inquirer.prompt(portPrompts);
  Object.assign(answers, portAnswers);

  console.log(chalk.bold.cyan('\n✨ Generating project structure...\n'));

  try {
    await generateProject(answers, __dirname);

    console.log(chalk.bold.green('\n✅ Project created successfully!\n'));

    const spinnerRepo = ora(chalk.cyan('Creating repository...')).start();
    try {
      await createRepository(answers);
      spinnerRepo.succeed(chalk.green('✅ Repository created and pushed!'));
    } catch (error) {
      spinnerRepo.fail(chalk.red('Repository creation failed'));
      console.log(chalk.yellow('\nYou can create the repository manually later:\n'));
      showManualRepoSteps(answers);
    }

    console.log(chalk.cyan('\nNext steps:\n'));
    console.log(
      chalk.white(
        `  cd ${answers.projectName}\n` +
        `  npm install\n` +
        `  docker-compose up\n`
      )
    );
    console.log(chalk.yellow('\nDon\'t forget to:\n'));
    console.log(
      chalk.white(
        '  1. Add CI/CD Secrets (SSH_PRIVATE_KEY, VPS_HOST, VPS_USER)\n' +
        '  2. Create server directories: /var/www/' +
        answers.projectName +
        '\n' +
        '  3. Update docker-compose.yml with your environment variables\n'
      )
    );
    console.log();
  } catch (error) {
    console.error(chalk.red('\n❌ Error creating project:\n'), error.message);
    process.exit(1);
  }
}

main();
