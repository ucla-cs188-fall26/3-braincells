# 3-braincells

# Blueprint

**Draw it before you prompt it.**

Blueprint is a visual planning tool for students who build apps with AI. Instead of describing an app in a long chat message, you draw it as boxes and arrows, add a short description and rules to each box, and send that plan to an AI model. When the code comes back, you click any box to see exactly which lines of code belong to it.

## Why

Students who vibe code want to be authors of their projects, but AI coding tools never push them to structure their design beyond a loose chat prompt, and hand back code faster than students can understand it. Blueprint gives the AI better context and gives students a way to understand what it wrote.

## How it works

1. **Plan.** Draw your app as boxes and arrows, label the arrows, and add rules to boxes, like "A task needs a title." Use **Mark for later** on a box to leave it out of the first version (it turns dotted and faded). **Check with AI** reviews the plan and suggests missing boxes, which you can keep or remove.
2. **Build.** A **Review** card shows exactly what will be sent to the AI: the boxes, arrows and rules in version 1, plus the boxes left out for later. **Send plan to AI** sends it to OpenAI, which writes the app's files. The files appear in a list once the AI is done, usually after 15 to 30 seconds.
3. **Understand.** Click a box to jump to its code: its lines turn blue with a name tag, its rule lines turn yellow, and file tabs that also hold its code get a blue dot. Click any line of code to see which box, arrow or rule it belongs to, explained in your own words with a tip on where to start if something goes wrong.

### How the code is linked to the plan

Building makes two requests to OpenAI:

1. **Write.** The AI gets the version-1 boxes, arrows and rules and writes the files. Boxes marked for later are listed so it knows to leave them out.
2. **Map.** The AI gets the plan again, plus the code with a line number in front of every line, and says which lines belong to each box, arrow and rule, with a short plain-language explanation and debugging tip for each.

The server checks every link from the second step and drops any that point at a file or line that doesn't exist. The Understand step is built entirely on these links. The AI writes different code each time, so file names and line numbers change between builds.

### Where your work is saved

Everything is saved in your browser's localStorage, not on the server: the plan, its name and the last finished build. That means:

- Editing the plan (including marking a box for later) resets the Build step. Moving boxes around or renaming the plan doesn't.
- **3 · Understand** stays locked until a build finishes for the current plan.
- To start over, clear the site's storage in your browser's dev tools.

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
- [OpenAI Node SDK](https://github.com/openai/openai-node): calls `gpt-4o-mini` to review a plan, write its code and link the code back to the plan
- [cors](https://github.com/expressjs/cors): lets the Vite frontend call the API
- [zod](https://zod.dev): checks incoming plans and gives OpenAI the exact shape its answers must follow
- [dotenv](https://github.com/motdotla/dotenv): loads API keys and config from `.env`
- [tsx](https://tsx.is): runs TypeScript directly with watch mode in development

## Getting Started

The frontend lives in the [`Blueprint/`](./Blueprint) folder and the backend in [`Blueprint/backend/`](./Blueprint/backend).

### Prerequisites

- [Node.js](https://nodejs.org) (v20.19+ recommended) and npm

- An [OpenAI API key](https://platform.openai.com/api-keys) (for the backend). Both **Check with AI** and **Send plan to AI** use it, so the backend must be running for them to work. Each build makes two requests on the key.

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

| Method | Path            | Description                                                                         |
| ------ | --------------- | ----------------------------------------------------------------------------------- |
| GET    | `/api/health`   | Confirms the server is running                                                      |
| POST   | `/api/check`    | Reviews a plan and suggests boxes (used by **Check with AI**)                       |
| POST   | `/api/generate` | Writes the app's code and links its lines to the plan (used by **Send plan to AI**) |

During development the frontend calls these with plain paths like `/api/generate`, and the Vite dev server forwards them to http://localhost:3001.

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
└── Blueprint/                    # React + TypeScript + Vite app
    ├── src/
    │   ├── pages/                # Home, Plan, Build and Understand pages
    │   ├── components/           # Canvas, boxes, arrows, top bar, code viewer, diagram
    │   └── lib/
    │       ├── planStorage.ts    # Saving and loading the plan (localStorage)
    │       ├── buildPayload.ts   # Turns the plan into what is sent to the AI
    │       ├── generateCode.ts   # Calls /api/generate and reads the files it returns
    │       ├── buildStore.ts     # Build progress, shared by the top bar and Build page
    │       └── trace.ts          # Finds a box's code, and the box behind a line
    ├── public/                   # Static assets
    ├── index.html                # App entry point
    └── backend/                  # Express + TypeScript API
        └── src/
            ├── server.ts         # Express app and routes
            ├── plan.ts           # Plan review: prompt, answer shape, cleanup
            ├── generate.ts       # Code generation: prompts, answer shapes, link checks
            ├── test-ai.ts        # Script to test the OpenAI connection
            └── service/
                └── ai.service.ts # OpenAI calls
```

## Status

An early MVP built for a UCLA CS188 (Human-Computer Interaction) by Andrea Asprer and Kayla Kurt.
