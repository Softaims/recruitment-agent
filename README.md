<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>

## Description

Recruitment Agent Platform - A topic-agnostic, extensible conversational AI platform built with NestJS, designed for recruitment workflows with the flexibility to expand into other domains.

## Project Setup

### Prerequisites
- Node.js >=20.0.0
- npm >=10.0.0
- PostgreSQL database

### Installation

```bash
# Install dependencies
$ npm install

# Copy environment variables
$ cp .env.example .env

# Generate Prisma client
$ npm run prisma:generate

# Run database migrations (when database is available)
$ npm run prisma:migrate
```

### Environment Configuration

Update the `.env` file with your configuration:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `REDIS_HOST/PORT`: Redis configuration for caching
- `OPENROUTER_API_KEY`: API key for LLM access
- `TAVILY_API_KEY`: API key for web search

### Database Setup

```bash
# Create and apply migrations
$ npm run prisma:migrate

# View database in Prisma Studio
$ npm run prisma:studio
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Documentation

- Architecture and Requirements Guide: [docs/Architecture_and_Requirements.md](docs/Architecture_and_Requirements.md)
- Recruitment Agent Project (Topic‑Agnostic Base): [docs/Recruitment_Agent_Project_Overview.md](docs/Recruitment_Agent_Project_Overview.md)
- Extensible Architecture (Topic‑Agnostic, Plugin‑Driven): [docs/Extensible_Architecture_Agent.md](docs/Extensible_Architecture_Agent.md)
- Feature Roadmap (P0 → P2): [docs/Features.md](docs/Features.md)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
