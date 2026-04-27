# Chatter

An Open WebUI-inspired AI chat application with Ollama and OpenAI-compatible API support.

## Features

- 💬 Chat interface with streaming responses
- 🤖 Support for Ollama and OpenAI-compatible APIs
- 📝 Full Markdown and code block rendering
- 🌙 Dark/Light mode toggle
- 📱 Responsive design
- 💾 Persistent chat history

## Tech Stack

- **Backend**: Python 3.12 + FastAPI
- **Frontend**: React 18 + Vite + Tailwind CSS
- **LLM**: Ollama API / OpenAI-compatible API

## Quick Start

### Docker Compose (Recommended)

For a full containerized development environment with hot-reload:

```bash
docker compose -f docker-compose.dev.yml up --build
```

- **Frontend**: [`http://localhost:5173`](http://localhost:5173) (Vite dev server with hot reload)
- **Backend API**: [`http://localhost:8000`](http://localhost:8000) (Uvicorn with `--reload`)

### Manual

#### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend runs on `http://localhost:8000`.

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

### Ollama (Optional)

If using Ollama, make sure it's running:

```bash
ollama serve
```

And pull a model:

```bash
ollama pull llama3.2
```

## Configuration

Access settings via the gear icon to configure:

- **Provider**: Ollama or OpenAI-compatible
- **URL**: Ollama base URL (default: `http://localhost:11434`)
- **API Key**: For OpenAI-compatible APIs
- **Model**: Default model to use

## Project Structure

```
chatter/
├── backend/
│   ├── main.py          # FastAPI app
│   ├── config.py        # Configuration management
│   ├── chat.py          # LLM integration
│   ├── history.py       # Chat history
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── hooks/
│   └── package.json
└── README.md
```

## License

MIT
