from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Set, Tuple
import heapq
import time
import asyncio
from datetime import datetime

from app.database import get_db, SessionLocal
from app.models import Order, Bot, Node, BlockedPath, OrderStatus, BotStatus

# Create router
router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

# Store active simulations
active_simulations: Dict[int, bool] = {}


def get_node_coords(node_id: int) -> Tuple[int, int]:
    """Convert node ID to (x, y) coordinates"""
    return (node_id % 9, node_id // 9)


def get_node_id(x: int, y: int) -> int:
    """Convert (x, y) to node ID"""
    return y * 9 + x


def calculate_path(start_x: int, start_y: int, end_x: int, end_y: int, blocked_set: Set[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """A* pathfinding algorithm"""
    
    def heuristic(a: Tuple[int, int], b: Tuple[int, int]) -> int:
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    
    def get_neighbors(pos: Tuple[int, int]) -> List[Tuple[int, int]]:
        x, y = pos
        neighbors = []
        for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
            new_x, new_y = x + dx, y + dy
            if 0 <= new_x < 9 and 0 <= new_y < 9:
                current_id = get_node_id(x, y)
                neighbor_id = get_node_id(new_x, new_y)
                if (current_id, neighbor_id) not in blocked_set:
                    neighbors.append((new_x, new_y))
        return neighbors
    
    start = (start_x, start_y)
    end = (end_x, end_y)
    
    open_set = [(0, start)]
    came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}
    g_score: Dict[Tuple[int, int], float] = {start: 0}
    
    while open_set:
        _, current = heapq.heappop(open_set)
        
        if current == end:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            path.reverse()
            return path
        
        for neighbor in get_neighbors(current):
            tentative_g = g_score.get(current, float('inf')) + 1
            if tentative_g < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score = tentative_g + heuristic(neighbor, end)
                heapq.heappush(open_set, (f_score, neighbor))
    
    return []


def run_simulation_sync(order_id: int):
    """Run simulation for a single order (synchronous)"""
    db = SessionLocal()
    
    try:
        # Get order
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order or not order.bot_id:
            return
        
        # Get bot
        bot = db.query(Bot).filter(Bot.id == order.bot_id).first()
        if not bot:
            return
        
        # Get blocked paths
        blocked = db.query(BlockedPath).all()
        blocked_set: Set[Tuple[int, int]] = set()
        for b in blocked:
            blocked_set.add((b.from_node_id, b.to_node_id))
            blocked_set.add((b.to_node_id, b.from_node_id))
        
        # Get pickup and delivery coordinates
        pickup_node = db.query(Node).filter(Node.id == order.pickup_node_id).first()
        delivery_node = db.query(Node).filter(Node.id == order.delivery_node_id).first()
        
        if not pickup_node or not delivery_node:
            return
        
        # Phase 1: Bot goes to restaurant (picking_up)
        order.status = OrderStatus.PICKING_UP
        db.commit()
        
        path_to_pickup = calculate_path(
            bot.current_x, bot.current_y,
            pickup_node.x, pickup_node.y,
            blocked_set
        )
        
        for x, y in path_to_pickup[1:]:  # Skip first position (current)
            if order_id not in active_simulations or not active_simulations[order_id]:
                return
            time.sleep(1)  # 1 second per step
            bot.current_x = x
            bot.current_y = y
            db.commit()
        
        # Phase 2: Pick up food
        order.status = OrderStatus.PICKED_UP
        db.commit()
        time.sleep(1)
        
        # Phase 3: Bot delivers to customer (delivering)
        order.status = OrderStatus.DELIVERING
        db.commit()
        
        path_to_delivery = calculate_path(
            bot.current_x, bot.current_y,
            delivery_node.x, delivery_node.y,
            blocked_set
        )
        
        for x, y in path_to_delivery[1:]:
            if order_id not in active_simulations or not active_simulations[order_id]:
                return
            time.sleep(1)
            bot.current_x = x
            bot.current_y = y
            db.commit()
        
        # Phase 4: Delivered!
        order.status = OrderStatus.DELIVERED
        order.delivered_at = datetime.utcnow()
        bot.current_orders_count -= 1
        bot.total_deliveries += 1
        if bot.current_orders_count == 0:
            bot.status = BotStatus.AVAILABLE
        db.commit()
        
        # Remove from active simulations
        if order_id in active_simulations:
            del active_simulations[order_id]
            
    except Exception as e:
        print(f"Simulation error: {e}")
    finally:
        db.close()


@router.post("/start/{order_id}")
def start_simulation(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Start automatic delivery simulation for an order"""
    
    # Check if order exists and is in valid state
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Order already completed or cancelled")
    
    if not order.bot_id:
        raise HTTPException(status_code=400, detail="No bot assigned to order")
    
    if order_id in active_simulations and active_simulations[order_id]:
        raise HTTPException(status_code=400, detail="Simulation already running")
    
    # Mark simulation as active
    active_simulations[order_id] = True
    
    # Start background simulation
    background_tasks.add_task(run_simulation_sync, order_id)
    
    return {
        "message": f"Simulation started for order {order_id}",
        "order_id": order_id
    }


@router.post("/stop/{order_id}")
def stop_simulation(order_id: int):
    """Stop simulation for an order"""
    if order_id in active_simulations:
        active_simulations[order_id] = False
        del active_simulations[order_id]
        return {"message": f"Simulation stopped for order {order_id}"}
    return {"message": "No active simulation found"}


@router.get("/status")
def get_simulation_status():
    """Get status of all active simulations"""
    return {
        "active_simulations": list(active_simulations.keys()),
        "count": len(active_simulations)
    }


@router.post("/auto-start")
def auto_start_simulations(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Automatically start simulations for all assigned orders"""
    
    # Find all orders that are assigned but not yet simulating
    orders = db.query(Order).filter(
        Order.status == OrderStatus.ASSIGNED,
        Order.bot_id.isnot(None)
    ).all()
    
    started = []
    for order in orders:
        if order.id not in active_simulations:
            active_simulations[order.id] = True
            background_tasks.add_task(run_simulation_sync, order.id)
            started.append(order.id)
    
    return {
        "message": f"Started {len(started)} simulations",
        "order_ids": started
    }