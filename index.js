#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateProject } from './src/generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      type: 'input',
      name: 'githubUser',
      message: 'GitHub username?',
      default: 'claude4man',
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
    console.log(chalk.cyan('Next steps:\n'));
    console.log(
      chalk.white(
        `  cd ${answers.projectName}\n` +
        `  git init\n` +
        `  git add .\n` +
        `  git commit -m "Initial commit"\n` +
        `  gh repo create ${answers.projectName} --private --source=. --push\n`
      )
    );
    console.log(chalk.yellow('\nDon\'t forget to:\n'));
    console.log(
      chalk.white(
        '  1. Add GitHub Secrets (SSH_PRIVATE_KEY, VPS_HOST, VPS_USER)\n' +
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
