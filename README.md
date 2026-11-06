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

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- [ESLint](https://eslint.org)

## Getting Started

The app lives in the [`Blueprint/`](./Blueprint) folder.

### Prerequisites

- [Node.js](https://nodejs.org) (v20.19+ recommended) and npm

### Install and run

```bash
cd 3-braincells/Blueprint
npm install
npm run dev
```

Then open the local URL printed in the terminal (usually http://localhost:5173).

## Available Scripts

Run these from the `Blueprint/` folder:

| Command           | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload         |
| `npm run build`   | Type-check and create a production build     |
| `npm run preview` | Preview the production build locally         |
| `npm run lint`    | Run ESLint                                   |

## Project Structure

```
3-braincells/
└── Blueprint/        # React + TypeScript + Vite app
    ├── src/          # Application source
    ├── public/       # Static assets
    └── index.html    # App entry point
```

## Status

An early MVP built for a UCLA CS188 (Human-Computer Interaction) by Andrea Asprer and Kayla Kurt.
