from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Order, Bot, Restaurant, Node, OrderStatus, BotStatus

# Create router
router = APIRouter(prefix="/api/orders", tags=["Orders"])

# Rate limit settings
RESTAURANT_ORDER_LIMIT = 3
RESTAURANT_ORDER_WINDOW = 30


# ============ GET ENDPOINTS ============

@router.get("/")
def get_all_orders(db: Session = Depends(get_db)):
    """Get all orders"""
    orders = db.query(Order).order_by(Order.id.desc()).all()
    
    # Serialize orders
    result = []
    for order in orders:
        result.append({
            "id": order.id,
            "customer_name": order.customer_name,
            "customer_address": order.customer_address,
            "pickup_node_id": order.pickup_node_id,
            "delivery_node_id": order.delivery_node_id,
            "restaurant_id": order.restaurant_id,
            "bot_id": order.bot_id,
            "status": order.status.value if order.status else "pending",
            "estimated_time": order.estimated_time,
            "created_at": order.created_at.isoformat() if order.created_at else None
        })
    
    return result


@router.get("/pending")
def get_pending_orders(db: Session = Depends(get_db)):
    """Get all pending orders"""
    orders = db.query(Order).filter(Order.status == OrderStatus.PENDING).all()
    return orders


@router.get("/active")
def get_active_orders(db: Session = Depends(get_db)):
    """Get all active orders"""
    active_statuses = [
        OrderStatus.ASSIGNED,
        OrderStatus.PICKING_UP,
        OrderStatus.PICKED_UP,
        OrderStatus.DELIVERING
    ]
    orders = db.query(Order).filter(Order.status.in_(active_statuses)).all()
    return orders


@router.get("/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Get a specific order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ============ POST ENDPOINTS ============

@router.post("/")
def create_order(
    customer_name: str,
    customer_address: str,
    restaurant_id: int,
    delivery_x: int,
    delivery_y: int,
    db: Session = Depends(get_db)
):
    """Create a new order with rate limiting"""
    
    # 1. Check restaurant exists
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # 2. Rate limit check
    thirty_seconds_ago = datetime.utcnow() - timedelta(seconds=RESTAURANT_ORDER_WINDOW)
    recent_orders_count = db.query(Order).filter(
        and_(
            Order.restaurant_id == restaurant_id,
            Order.created_at >= thirty_seconds_ago
        )
    ).count()
    
    if recent_orders_count >= RESTAURANT_ORDER_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Restaurant busy! Max {RESTAURANT_ORDER_LIMIT} orders per {RESTAURANT_ORDER_WINDOW}s. Try again later."
        )
    
    # 3. Validate delivery location
    if not (0 <= delivery_x <= 8 and 0 <= delivery_y <= 8):
        raise HTTPException(status_code=400, detail="Invalid delivery location (must be 0-8)")
    
    pickup_node_id = restaurant.node_id
    delivery_node_id = delivery_y * 9 + delivery_x
    
    # 4. Format address
    formatted_address = f"L{delivery_y}{delivery_x}"
    if customer_address:
        formatted_address = f"{formatted_address} - {customer_address}"
    
    # 5. Create order
    new_order = Order(
        customer_name=customer_name,
        customer_address=formatted_address,
        pickup_node_id=pickup_node_id,
        delivery_node_id=delivery_node_id,
        restaurant_id=restaurant_id,
        status=OrderStatus.PENDING
    )
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    # 6. Auto-assign bot
    bot = db.query(Bot).filter(
        Bot.current_orders_count < 3
    ).order_by(Bot.current_orders_count.asc()).first()
    
    if bot:
        new_order.bot_id = bot.id
        new_order.status = OrderStatus.ASSIGNED
        new_order.assigned_at = datetime.utcnow()
        
        bot.current_orders_count = bot.current_orders_count + 1
        bot.status = BotStatus.BUSY
        
        db.commit()
        db.refresh(bot)
        
        print(f"✅ Assigned Order #{new_order.id} to {bot.name}, orders: {bot.current_orders_count}/3")
    
    return {
        "message": "Order created!",
        "order_id": new_order.id,
        "address": formatted_address,
        "bot_assigned": bot.name if bot else None
    }


# ============ PUT ENDPOINTS ============

@router.put("/{order_id}/status/{new_status}")
def update_order_status(order_id: int, new_status: str, db: Session = Depends(get_db)):
    """Update order status"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        status_enum = OrderStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
    
    old_status = order.status
    order.status = status_enum
    
    # Handle delivered
    if status_enum == OrderStatus.DELIVERED:
        order.delivered_at = datetime.utcnow()
        if order.bot_id:
            bot = db.query(Bot).filter(Bot.id == order.bot_id).first()
            if bot:
                bot.current_orders_count = max(0, bot.current_orders_count - 1)
                bot.total_deliveries = bot.total_deliveries + 1
                if bot.current_orders_count == 0:
                    bot.status = BotStatus.AVAILABLE
                db.commit()
    
    # Handle cancelled
    elif status_enum == OrderStatus.CANCELLED:
        if order.bot_id:
            bot = db.query(Bot).filter(Bot.id == order.bot_id).first()
            if bot:
                bot.current_orders_count = max(0, bot.current_orders_count - 1)
                if bot.current_orders_count == 0:
                    bot.status = BotStatus.AVAILABLE
            order.bot_id = None
    
    db.commit()
    return {"message": f"Order {order_id} status updated to {new_status}"}


# ============ DELETE ENDPOINTS ============

@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Delete a pending order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only delete pending orders")
    
    # Free bot if assigned
    if order.bot_id:
        bot = db.query(Bot).filter(Bot.id == order.bot_id).first()
        if bot:
            bot.current_orders_count = max(0, bot.current_orders_count - 1)
            if bot.current_orders_count == 0:
                bot.status = BotStatus.AVAILABLE
    
    db.delete(order)
    db.commit()
    return {"message": f"Order {order_id} deleted"}


@router.post("/{order_id}/cancel")
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    """Cancel an order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status == OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Cannot cancel delivered order")
    
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Already cancelled")
    
    # Free bot
    if order.bot_id:
        bot = db.query(Bot).filter(Bot.id == order.bot_id).first()
        if bot:
            bot.current_orders_count = max(0, bot.current_orders_count - 1)
            if bot.current_orders_count == 0:
                bot.status = BotStatus.AVAILABLE
    
    order.status = OrderStatus.CANCELLED
    order.bot_id = None
    db.commit()
    
    return {"message": f"Order {order_id} cancelled"}