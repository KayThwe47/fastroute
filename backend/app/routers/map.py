from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Set, Tuple
import heapq

from app.database import get_db
from app.models import Node, BlockedPath, Bot, Restaurant, Order, OrderStatus, BotStatus

router = APIRouter(prefix="/api/map", tags=["Map"])


@router.get("/nodes")
def get_all_nodes(db: Session = Depends(get_db)):
    nodes = db.query(Node).all()
    return nodes


@router.get("/blocked-paths")
def get_blocked_paths(db: Session = Depends(get_db)):
    blocked = db.query(BlockedPath).all()
    return [
        {"from_id": b.from_node_id, "to_id": b.to_node_id}
        for b in blocked
    ]


@router.get("/data")
def get_map_data(db: Session = Depends(get_db)):
    nodes = db.query(Node).all()
    blocked_paths = db.query(BlockedPath).all()
    restaurants = db.query(Restaurant).filter(Restaurant.is_active == True).all()
    bots = db.query(Bot).all()
    
    # Manually serialize bots to ensure fresh data
    bots_data = []
    for bot in bots:
        db.refresh(bot)
        bots_data.append({
            "id": bot.id,
            "name": bot.name,
            "status": bot.status.value if bot.status else "available",
            "current_x": bot.current_x,
            "current_y": bot.current_y,
            "current_orders_count": bot.current_orders_count,
            "total_deliveries": bot.total_deliveries
        })
    
    # Serialize nodes
    nodes_data = []
    for node in nodes:
        nodes_data.append({
            "id": node.id,
            "x": node.x,
            "y": node.y,
            "is_delivery_point": node.is_delivery_point,
            "is_restaurant": node.is_restaurant,
            "restaurant_type": node.restaurant_type
        })
    
    # Serialize restaurants
    restaurants_data = []
    for r in restaurants:
        restaurants_data.append({
            "id": r.id,
            "name": r.name,
            "restaurant_type": r.restaurant_type.value if r.restaurant_type else None,
            "node_id": r.node_id,
            "is_active": r.is_active
        })
    
    return {
        "grid_size": 9,
        "nodes": nodes_data,
        "blocked_paths": [
            {"from_id": b.from_node_id, "to_id": b.to_node_id}
            for b in blocked_paths
        ],
        "restaurants": restaurants_data,
        "bots": bots_data
    }


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(Order.status == OrderStatus.PENDING).count()
    delivered_orders = db.query(Order).filter(Order.status == OrderStatus.DELIVERED).count()
    
    active_statuses = [OrderStatus.ASSIGNED, OrderStatus.PICKING_UP, 
                       OrderStatus.PICKED_UP, OrderStatus.DELIVERING]
    active_orders = db.query(Order).filter(Order.status.in_(active_statuses)).count()
    
    available_bots = db.query(Bot).filter(Bot.status == BotStatus.AVAILABLE).count()
    busy_bots = db.query(Bot).filter(Bot.status == BotStatus.BUSY).count()
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "active_deliveries": active_orders,
        "completed_deliveries": delivered_orders,
        "available_bots": available_bots,
        "busy_bots": busy_bots
    }


@router.get("/route")
def calculate_route(
    start_x: int,
    start_y: int,
    end_x: int,
    end_y: int,
    db: Session = Depends(get_db)
):
    """
    Calculate shortest path between two points using A* algorithm.
    """
    # Load blocked paths
    blocked = db.query(BlockedPath).all()
    blocked_set: Set[Tuple[int, int]] = set()
    for b in blocked:
        blocked_set.add((b.from_node_id, b.to_node_id))
        blocked_set.add((b.to_node_id, b.from_node_id))
    
    def get_node_id(x: int, y: int) -> int:
        return y * 9 + x
    
    def get_coords(node_id: int) -> Tuple[int, int]:
        return (node_id % 9, node_id // 9)
    
    def get_neighbors(node_id: int) -> List[int]:
        x, y = get_coords(node_id)
        neighbors = []
        
        for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
            new_x, new_y = x + dx, y + dy
            
            if 0 <= new_x < 9 and 0 <= new_y < 9:
                neighbor_id = get_node_id(new_x, new_y)
                
                if (node_id, neighbor_id) not in blocked_set:
                    neighbors.append(neighbor_id)
        
        return neighbors
    
    def heuristic(node_id: int, goal_id: int) -> int:
        x1, y1 = get_coords(node_id)
        x2, y2 = get_coords(goal_id)
        return abs(x1 - x2) + abs(y1 - y2)
    
    start_id = get_node_id(start_x, start_y)
    end_id = get_node_id(end_x, end_y)
    
    open_set = [(0, start_id)]
    came_from: Dict[int, int] = {}
    g_score: Dict[int, float] = {start_id: 0}
    
    while open_set:
        _, current = heapq.heappop(open_set)
        
        if current == end_id:
            path = []
            while current in came_from:
                x, y = get_coords(current)
                path.append({"x": x, "y": y})
                current = came_from[current]
            path.append({"x": start_x, "y": start_y})
            path.reverse()
            
            return {
                "path": path,
                "distance": len(path) - 1,
                "estimated_time": len(path) - 1
            }
        
        for neighbor in get_neighbors(current):
            tentative_g = g_score.get(current, float('inf')) + 1
            
            if tentative_g < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score = tentative_g + heuristic(neighbor, end_id)
                heapq.heappush(open_set, (f_score, neighbor))
    
    raise HTTPException(status_code=400, detail="No path found")