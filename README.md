# Holding OS

**AI-powered operating system for managing holdings, projects, and execution workflows.**

Holding OS is an experimental full-stack product built to explore how AI agents, authenticated dashboards, and lightweight monitoring can help an operator manage multiple digital assets from one place.

> Built with Next.js 16, React 19, Clerk Auth, OpenAI, Claude, and Upstash Redis.

---

## What this project is

Holding OS is a portfolio project focused on operator leverage: using AI APIs and web automation patterns to turn scattered business/project data into a clearer command center.

The project is intended to demonstrate:

- AI-native product thinking
- Full-stack app structure with Next.js App Router
- Authenticated user flows with Clerk
- AI API integration using OpenAI and Anthropic Claude
- Server-side monitoring backed by Upstash Redis
- Production-oriented environment configuration

---

## Core capabilities

| Area | Description |
|---|---|
| AI assistant layer | Connects to OpenAI and Anthropic Claude for AI-powered workflows |
| Authenticated app | Uses Clerk to protect app and API routes |
| Monitoring endpoint | Stores and reads request monitoring data through Upstash Redis |
| Operator dashboard foundation | Designed as a control layer for projects, holdings, and automations |
| Production setup | Environment variables prepared for deployment on Vercel |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript |
| Auth | Clerk |
| AI | OpenAI API, Anthropic Claude API |
| Data / monitoring | Upstash Redis |
| Deployment | Vercel |

---

## Environment variables

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

---

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```bash
http://localhost:3000
```

---

## Production deployment

```bash
npm run build
vercel --prod
```

---

## Why this matters

This project shows the direction of my work: building AI-assisted systems that reduce manual execution, connect tools together, and create leverage for business operators.

It is part of a broader portfolio alongside **RepeatTree**, a customer intelligence SaaS for ecommerce retention and repeat purchase analytics.

---

## Built by

**Streynight** — AI-native builder focused on SaaS, automation, and operator systems.

GitHub: [github.com/Streynight](https://github.com/Streynight)
