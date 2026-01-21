from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio
import json
from datetime import datetime

from app.database import get_db, SessionLocal
from app.models import Order, Bot, OrderStatus

# Create router
router = APIRouter(prefix="/api/stream", tags=["Real-time Streaming"])


async def order_event_generator():
    last_states = {}
    
    while True:
        try:
            # Create new database session
            db = SessionLocal()
            
            try:
                # Get all non-completed orders
                orders = db.query(Order).filter(
                    Order.status.notin_([OrderStatus.DELIVERED, OrderStatus.CANCELLED])
                ).all()
                
                # Get all bots
                bots = db.query(Bot).all()
                
                # Build current state
                orders_data = []
                for order in orders:
                    order_state = {
                        "id": order.id,
                        "customer_name": order.customer_name,
                        "status": order.status.value,
                        "bot_id": order.bot_id,
                        "pickup_node_id": order.pickup_node_id,
                        "delivery_node_id": order.delivery_node_id,
                        "restaurant_id": order.restaurant_id
                    }
                    orders_data.append(order_state)
                
                bots_data = []
                for bot in bots:
                    bot_state = {
                        "id": bot.id,
                        "name": bot.name,
                        "status": bot.status.value,
                        "current_x": bot.current_x,
                        "current_y": bot.current_y,
                        "orders_count": bot.current_orders_count
                    }
                    bots_data.append(bot_state)
                
                # Create event data
                event_data = {
                    "type": "update",
                    "timestamp": datetime.utcnow().isoformat(),
                    "orders": orders_data,
                    "bots": bots_data
                }
                
                # Send SSE format
                yield f"data: {json.dumps(event_data)}\n\n"
                
            finally:
                db.close()
            
            # Wait 2 seconds before next update
            await asyncio.sleep(2)
            
        except Exception as e:
            error_data = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
            await asyncio.sleep(5)


@router.get("/orders")
async def stream_orders():
    """
    Stream real-time order updates via Server-Sent Events.
    
    Connect to this endpoint to receive live updates about:
    - Order status changes
    - Bot positions
    - New orders
    
    Usage in JavaScript:
```
    const eventSource = new EventSource('/api/stream/orders');
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Update:', data);
    };
```
    """
    return StreamingResponse(
        order_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        }
    )


@router.get("/health")
def stream_health():
    """Check if streaming endpoint is available"""
    return {"status": "streaming available", "endpoint": "/api/stream/orders"}