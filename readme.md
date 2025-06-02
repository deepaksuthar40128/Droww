# Droww — Real-Time Stock Order Book & Trade Execution System

Droww is a full-stack real-time trading simulation platform featuring:
- A **WebSocket-driven order book**
- **Django backend** with ASGI support
- **React frontend** for frontend

---

## Setup & Run Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- Daphne

---

### Backend (Django)

1. Clone the repository:
```bash
   git clone https://github.com/deepaksuthar40128/Droww.git
   cd Droww
```

# To run this on local 
1.
```bash
sudo chmod +x run.sh
```
2.
```bash
./run.sh
```
This will:
- Create a virtual environment

- Install dependencies

- Run Django migrations

- Start Django dev server on http://localhost:8000/

- Launch ASGI server on http://localhost:8001/

## Frontend

Located in the `frontend/` directory.

To run manually:
```
cd frontend
npm install
npm run dev
```
App runs at: http://localhost:5173/

## Assumptions & Limitations
- Single shared WebSocket stream is used to send the order book to all users periodically.
- Data will be come from any broker api (genrating random data here to avoid use of paid api token)
- Check user authentication on ws connection upgrade time only not during each message communication.
- Uses in-memory data (no persistent DB storage for trades).
- Assuming no order cancel or update once order placed.

## Live OHLC chart

- Built a real-time OHLC candlestick chart using D3.js that reflects market activity.
- Designed to handle high-frequency incoming data efficiently (When the browser tab is not visible, chart updates are batched and deferred, then flushed when visibility resumes)
This will prevents:
 - UI freezing
 - Memory pressure on the browser
 - Unnecessary rendering work & animation of old data on visiblity
