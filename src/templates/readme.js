export function generateREADME(answers) {
  const frontendPort = parseInt(answers.frontendPort) || 6500;
  const backendPort = parseInt(answers.backendPort) || 6501;
  const adminPort = parseInt(answers.adminPort) || 6502;
  const dbPort = parseInt(answers.dbPort) || 6503;

  let structure = `${answers.projectName}/\n`;

  if (answers.components.includes('backend')) {
    structure += '├── backend/           # NestJS API\n';
  }
  if (answers.components.includes('frontend')) {
    structure += '├── frontend/          # Next.js Frontend\n';
  }
  if (answers.components.includes('admin')) {
    structure += '├── admin/             # Admin Panel (Next.js + MUI)\n';
  }
  if (answers.components.includes('landing')) {
    structure += '├── landing/           # Landing Page\n';
  }

  structure += '├── docker-compose.yml\n├── CLAUDE.md\n└── README.md';

  let scripts = '- `npm run dev` - Start Docker containers\n- `npm run build` - Build Docker images\n- `npm run down` - Stop containers\n';

  if (answers.components.includes('backend') && answers.includeDatabase) {
    scripts += '- `npm run db:migrate` - Run Prisma migrations\n- `npm run db:studio` - Open Prisma Studio\n';
  }

  let access = '';
  if (answers.components.includes('frontend')) {
    access += `   - Frontend: http://localhost:${frontendPort}\n`;
  }
  if (answers.components.includes('backend')) {
    access += `   - API: http://localhost:${backendPort}\n`;
  }
  if (answers.components.includes('admin')) {
    access += `   - Admin: http://localhost:${adminPort}\n`;
  }
  if (answers.includeDatabase) {
    access += `   - Database: localhost:${dbPort}\n`;
  }

  return `# ${answers.projectName}

TikTok template project with Next.js, NestJS, and PostgreSQL.

## Quick Start

\`\`\`bash
# Install dependencies
npm install:all

# Run in Docker
npm run dev

# Build
npm run build

# Stop containers
npm run down
\`\`\`

## Project Structure

\`\`\`
${structure}
\`\`\`

## Available Scripts

${scripts}

## Deployment

Domain: https://${answers.subdomain}.eazyclaw.app

GitHub: https://github.com/${answers.githubUser}/${answers.projectName}

## Development

1. Copy \`.env.example\` to \`.env.local\`
2. Update environment variables
3. Run \`npm run dev\`
4. Access:
${access}

## Documentation

See \`CLAUDE.md\` for more information.
`;
}
