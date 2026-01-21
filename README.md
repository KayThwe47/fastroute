# 🤖 fastroute - Autonomous Food Delivery Bot System

A modern route optimization system for autonomous food delivery bots.

![fastroute](https://img.shields.io/badge/fastroute-v1.0-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

## Overview

fastroute is an eco-friendly bot food delivery service system that helps:
- Select delivery points on a map
- Automatically calculate the most efficient delivery route (A* Algorithm)
- Assign orders to available bots while respecting capacity
- View real-time updates on delivery status

## Features

| Feature | Description |
|---------|-------------|
| Interactive Map | 9×9 grid map with restaurants, bots, and delivery points |
| 5 Delivery Bots | Each bot can carry max 3 orders |
| 4 Restaurant Types | Ramen, Curry, Pizza, Sushi |
| Auto Route Calculation | A* pathfinding algorithm |
| Real-time Updates | Server-Sent Events (SSE) streaming |
| Rate Limiting | 3 orders per restaurant per 30 seconds |
| Auto Simulation | Watch bots deliver in real-time |

## Tech Stack

### Frontend
- Next.js 14 - React framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- Axios - API calls

### Backend
- FastAPI - Python web framework
- SQLAlchemy - ORM
- PostgreSQL - Database
- SSE - Real-time streaming

### Infrastructure
- Docker - Containerization
- Docker Compose - Multi-container orchestration

## Project Structure
```
fastroute/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── orders.py      # Order CRUD endpoints
│   │   │   ├── bots.py        # Bot endpoints
│   │   │   ├── restaurants.py # Restaurant endpoints
│   │   │   ├── map.py         # Map & route calculation
│   │   │   ├── streaming.py   # SSE real-time updates
│   │   │   └── simulation.py  # Auto delivery simulation
│   │   ├── database.py        # Database connection
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── seed_data.py       # Initial data
│   │   └── main.py            # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Main page
│   │   ├── layout.tsx         # Layout
│   │   └── globals.css        # Styles
│   ├── components/
│   │   ├── MapGrid.tsx        # Interactive map
│   │   ├── OrderForm.tsx      # Order creation form
│   │   ├── OrderList.tsx      # Orders list
│   │   └── BotStatus.tsx      # Bot fleet panel
│   ├── lib/
│   │   └── api.ts             # API client
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Git

### Installation

1. Clone the repository
```bash
git clone https://
cd naw_kay_thwe_khaing
```

2. Start the application
```bash
docker compose up --build
```

3. Access the application
-  Frontend: http://localhost:3000
-  API Docs: http://localhost:8000/docs
-  Backend: http://localhost:8000

## How to Use

### 1. Create an Order
1. Click on the map to select a delivery location
2. Enter customer name
3. Select a restaurant
4. Click "Create Order"

### 2. Start Delivery
1. Find your order in the Orders list
2. Click "🚀 Start Delivery" button
3. Watch the bot move on the map!

### 3. Track Progress
- Route shows on map when order is selected
- Progress bar shows delivery status
- Bot Fleet shows bot positions and capacity

## Map Legend

| Symbol | Meaning |
|--------|---------|
| 🍜🍛🍕🍣 | Restaurants |
| 🤖 | Delivery Bot |
| 🏠 | Delivery Point |
| 🔴 Red Line | Blocked Path |
| 🟣 Purple | Delivery Route |

## 📊 Order Status Flow
```
📝 Pending → 🤖 Assigned → 📦 Picking Up → ✅ Picked Up → 🚚 Delivering → 🎉 Delivered
```

## 🔧 API Endpoints

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/orders | Get all orders |
| POST | /api/orders | Create order |
| PUT | /api/orders/{id}/status/{status} | Update status |
| DELETE | /api/orders/{id} | Delete order |
| POST | /api/orders/{id}/cancel | Cancel order |

### Bots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/bots | Get all bots |
| GET | /api/bots/available | Get available bots |

### Map
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/map/data | Get map data |
| GET | /api/map/route | Calculate route (A*) |
| GET | /api/map/stats | Get statistics |

### Simulation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/simulation/start/{id} | Start auto delivery |
| POST | /api/simulation/stop/{id} | Stop simulation |

## 📐 Database Schema

### Tables
- nodes(81 rows) - Map grid nodes
- blocked_paths - Blocked connections
- bots (5 rows) - Delivery bots
- restaurants (6 rows) - Food restaurants
- orders - Customer orders

### Key Relationships
```
Orders → Restaurants (pickup location)
Orders → Nodes (delivery location)
Orders → Bots (assigned bot)
```

## Business Rules

- 🤖 Total Bots: 5
- 📦 Max orders per bot: 3
- ⏱️ Restaurant rate limit: 3 orders per 30 seconds
- 📍 Address format: L{row}{col} (e.g., L00, L74)
- 🗺️ Grid size: 9×9

## Testing

### API Testing
Open http://localhost:8000/docs for interactive Swagger UI

### Database Access
- Host: localhost
- Port: 5432
- Database: fastroute_db
- Username: fastroute
- Password: fastroute123

## Author

Naw Kay Thwe Khaing
Portfolio Project | Open Source

## License & Usage Terms 

This project is open source and available for personal portfolio, learning, and demonstration purposes.

© 2026 — All Rights Reserved