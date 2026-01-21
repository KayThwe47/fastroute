from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db, SessionLocal
from app.seed_data import seed_database

# Import routers
from app.routers import orders, bots, restaurants, map, streaming, simulation


# === Startup Function ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs when server starts"""
    print("🚀 Starting fastroute server...")
    
    # Create database tables
    init_db()
    print("✅ Database tables created!")
    
    # Fill with sample data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    
    yield  # Server runs here
    
    print("👋 Shutting down server...")


# === Create FastAPI App ===
app = FastAPI(
    title="fastroute Delivery Bot System",
    description="""
    ## Route Optimization API for Autonomous Delivery Bots
    
    ### Features:
    - Orders: Create, manage, and track delivery orders
    - Bots: Monitor delivery bot fleet
    - Restaurants: Manage restaurant partners (rate limited: 3 orders/30sec)
    - Map: 9x9 grid with route calculation (A* algorithm)
    - Streaming: Real-time updates via Server-Sent Events
    
    ### Business Rules:
    - Total Bots: 5
    - Max orders per bot: 3
    - Restaurant rate limit: 3 orders per 30 seconds
    - Grid size: 9x9
    - Address format
    """,
    version="1.0.0",
    lifespan=lifespan
)


# === Middleware ===

# CORS - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Include Routers ===
app.include_router(orders.router)
app.include_router(bots.router)
app.include_router(restaurants.router)
app.include_router(map.router)
app.include_router(streaming.router)
app.include_router(simulation.router)


# === Basic Endpoints ===
@app.get("/")
def home():
    """Home page - shows API info"""
    return {
        "name": "fastroute Delivery Bot System",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "orders": "/api/orders",
            "bots": "/api/bots",
            "restaurants": "/api/restaurants",
            "map": "/api/map",
            "stream": "/api/stream/orders"
        }
    }


@app.get("/health")
def health_check():
    """Health check - is server running?"""
    return {"status": "healthy"}