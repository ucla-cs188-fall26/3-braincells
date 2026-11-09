# 3-braincells

# Blueprint

**Draw it before you prompt it.**

Blueprint is a visual planning tool for students who build apps with AI. Instead of describing an app in a long chat message, you draw it as boxes and arrows, add a short description and rules to each box, and send that plan to an AI model. When the code comes back, you click any box to see exactly which lines of code belong to it.

## Why

Students who vibe code want to be authors of their projects, but AI coding tools never push them to structure their design beyond a loose chat prompt, and hand back code faster than students can understand it. Blueprint gives the AI better context and gives students a way to understand what it wrote.

## How it works

1. **Plan.** Draw your app as boxes and arrows. Add rules like "Never send a reminder after 9pm." A panel shows exactly what the AI will read.
2. **Build.** Send the plan to the AI and get code back.
3. **Understand.** Click a box to see its lines of code, or click a line to see which box it belongs to.

## Tech Stack

### Frontend

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Flow (`@xyflow/react`)](https://reactflow.dev): the boxes-and-arrows canvas
- [React Router](https://reactrouter.com)
- [Heroicons](https://heroicons.com)
- [ESLint](https://eslint.org)

### Backend

- [Node.js](https://nodejs.org) + [TypeScript](https://www.typescriptlang.org)
- [Express 5](https://expressjs.com): REST API server
- [OpenAI Node SDK](https://github.com/openai/openai-node): calls `gpt-4o-mini` to generate code from a plan
- [cors](https://github.com/expressjs/cors): lets the Vite frontend call the API
- [dotenv](https://github.com/motdotla/dotenv): loads API keys and config from `.env`
- [tsx](https://tsx.is): runs TypeScript directly with watch mode in development

## Getting Started

The frontend lives in the [`Blueprint/`](./Blueprint) folder and the backend in [`Blueprint/backend/`](./Blueprint/backend).

### Prerequisites

- [Node.js](https://nodejs.org) (v20.19+ recommended) and npm

- An [OpenAI API key](https://platform.openai.com/api-keys) (for the backend)

### Run the frontend

```bash
cd 3-braincells/Blueprint
npm install
npm run dev
```

Then open the local URL printed in the terminal (usually http://localhost:5173).

### Run the backend

In a second terminal:

```bash
cd 3-braincells/Blueprint/backend
npm install
```

Create a `.env` file in `Blueprint/backend/`:

```env
OPENAI_API_KEY=your-openai-api-key
PORT=3001
```

`.env` is gitignored, so never commit your key. Then start the server:

```bash
npm run dev
```

The API runs at http://localhost:3001. Check it with http://localhost:3001/api/health, which should return `{ "message": "Backend is working!" }`.

### API endpoints

| Method | Path          | Description                    |
| ------ | ------------- | ------------------------------ |
| GET    | `/api/health` | Confirms the server is running |

## Available Scripts

### Frontend

Run these from the `Blueprint/` folder:

| Command           | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload         |
| `npm run build`   | Type-check and create a production build     |
| `npm run preview` | Preview the production build locally         |
| `npm run lint`    | Run ESLint                                   |

### Backend

Run these from the `Blueprint/backend/` folder:

| Command           | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `npm run dev`     | Start the API server with auto-reload (tsx watch)          |
| `npm run build`   | Compile TypeScript to `dist/`                              |
| `npm start`       | Run the compiled server from `dist/`                       |
| `npm run test:ai` | Send a sample prompt to OpenAI to check your key works     |

## Project Structure

```
3-braincells/
└── Blueprint/                # React + TypeScript + Vite app
    ├── src/                  # Frontend source
    ├── public/               # Static assets
    ├── index.html            # App entry point
    └── backend/              # Express + TypeScript API
        └── src/
            ├── server.ts     # Express app and routes
            ├── test-ai.ts    # Script to test the OpenAI connection
            └── service/
                └── ai.service.ts  # OpenAI calls
```

## Status

An early MVP built for a UCLA CS188 (Human-Computer Interaction) by Andrea Asprer and Kayla Kurt.
