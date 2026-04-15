# ♟️ Shatranj (Chess Brain Factory)

Shatranj is a modern, high-performance web application designed for playing and analyzing chess. It bridges a sleek React-based UI with a powerful Python backend that handles complete game state parsing, evaluation utilizing the **Stockfish Engine**, and an interactive natural-language chess coach powered by **Nvidia NIM**.

## 🚀 Tech Stack

### Frontend
* **Framework:** Next.js (React 19)
* **Styling:** Tailwind CSS V4
* **Chess Logic:** `chess.js`
* **Network:** Axios

### Backend
* **API:** FastAPI + Uvicorn
* **Database:** SQLite (SQLAlchemy ORM + Alembic)
* **Chess Parsing:** `python-chess`
* **Engine Hookup:** Stockfish
* **AI Integration:** Nvidia NIM (using OpenAI Python SDK)

---

## 🛠️ Getting Started

Follow these steps to set up the development environment successfully on your local machine.

### 1. Requirements
- Node.js (v18+)
- Python (3.10+)
- [Stockfish Executable](https://stockfishchess.org/download/)
- Nvidia NIM API Key (Available in the Nvidia Developer portal)

### 2. Backend Setup
Open a terminal and set up the Python environment:

```bash
cd backend
python -m venv venv
# On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt
```

**Configure Environment:**
Copy the example environment variables and edit them with your specific keys and paths:
```bash
cp .env.example .env
```
Inside `.env`, make sure to add your **Nvidia NIM API Key** and the absolute path to your downloaded **Stockfish executable**.

**Start the Server:**
```bash
uvicorn app.main:app --reload --port 8000
```
*Note: SQLite tables are automatically generated when the server starts up.*

### 3. Frontend Setup
In a second terminal, configure and launch the Next.js application:

```bash
cd frontend
npm install
npm run dev
```

### 4. Play!
Visit `http://localhost:3000` in your browser. 
Import your PGNs, analyze positions, and use the integrated chat coach!

---

## 🏗️ Architecture

- `/games/import`: Converts raw PGN strings into a series of FEN positions. 
- `/analyze`: Runs multi-depth Stockfish computation on the current position to serve evaluation scopes and best moves.
- `/chat`: Connects your position context to `meta/llama3-70b-instruct` specifically prompted as a grandmaster chess coach, bringing you actionable insights!
