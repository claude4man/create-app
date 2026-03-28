export function generateDockerCompose(answers) {
  const frontendPort = parseInt(answers.frontendPort) || 6500;
  const backendPort = parseInt(answers.backendPort) || 6501;
  const adminPort = parseInt(answers.adminPort) || 6502;
  const dbPort = parseInt(answers.dbPort) || 6503;

  const services = {};

  // Only add postgres if includeDatabase is true
  if (answers.includeDatabase) {
    services.postgres = `
  postgres:
    image: postgres:17-alpine
    container_name: ${answers.projectName}-db
    environment:
      POSTGRES_USER: \${DB_USER:-postgres}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${answers.projectName}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "${dbPort}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5`;
  }

  if (answers.components.includes('backend')) {
    let backendConfig = `
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: ${answers.projectName}-backend
    environment:
      NODE_ENV: production`;

    if (answers.includeDatabase) {
      backendConfig += `
      DATABASE_URL: postgresql://\${DB_USER:-postgres}:\${DB_PASSWORD:-postgres}@postgres:5432/${answers.projectName}`;
    }

    backendConfig += `
      PORT: ${backendPort}
    ports:
      - "${backendPort}:${backendPort}"`;

    if (answers.includeDatabase) {
      backendConfig += `
    depends_on:
      postgres:
        condition: service_healthy`;
    }

    backendConfig += `
    volumes:
      - ./backend/src:/app/src`;

    services.backend = backendConfig;
  }

  if (answers.components.includes('frontend')) {
    let apiUrl = `http://localhost:${backendPort}`;

    services.frontend = `
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: ${answers.projectName}-frontend
    environment:
      NEXT_PUBLIC_API_URL: ${apiUrl}
    ports:
      - "${frontendPort}:3000"
    depends_on:
      - backend`;
  }

  if (answers.components.includes('admin')) {
    let apiUrl = `http://localhost:${backendPort}`;

    services.admin = `
  admin:
    build:
      context: ./admin
      dockerfile: Dockerfile
    container_name: ${answers.projectName}-admin
    environment:
      NEXT_PUBLIC_API_URL: ${apiUrl}
    ports:
      - "${adminPort}:3000"
    depends_on:
      - backend`;
  }

  const servicesList = Object.entries(services)
    .map(([name, config]) => config)
    .join('\n');

  let volumesSection = '';
  if (answers.includeDatabase) {
    volumesSection = `
volumes:
  postgres_data:
    driver: local`;
  }

  return `version: '3.8'

services:${servicesList}${volumesSection}
`;
}
