from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


# ============ ENUMS Status ============

class OrderStatus(str, enum.Enum):
    """Possible statuses for an order"""
    PENDING = "pending"
    ASSIGNED = "assigned"
    PICKING_UP = "picking_up"
    PICKED_UP = "picked_up"
    DELIVERING = "delivering"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class BotStatus(str, enum.Enum):
    """Possible statuses for a bot"""
    AVAILABLE = "available"
    BUSY = "busy"
    RETURNING = "returning"
    OFFLINE = "offline"


class RestaurantType(str, enum.Enum):
    """Types of restaurants"""
    RAMEN = "RAMEN"
    CURRY = "CURRY"
    PIZZA = "PIZZA"
    SUSHI = "SUSHI"


# ============ 1: nodes  ============

class Node(Base):
    """
    Represents a point on the 9x9 grid map.
    Total: 81 nodes (0-80)
    
    id = y * 9 + x
    Example: position (3,2) has id = 2*9+3 = 21
    """
    __tablename__ = "nodes"
    
    id = Column(Integer, primary_key=True)
    x = Column(Integer, nullable=False)  # 0-8
    y = Column(Integer, nullable=False)  # 0-8
    is_delivery_point = Column(Boolean, default=False)
    is_restaurant = Column(Boolean, default=False)
    restaurant_type = Column(String(50), nullable=True)


# ============  2: blocked_paths ============

class BlockedPath(Base):
    """
    Stores paths that bots cannot use.
    Example: from_node_id=4, to_node_id=12 means
    you cannot go directly from node 4 to node 12
    """
    __tablename__ = "blocked_paths"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    from_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    to_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)


# ============  3: bots ============

class Bot(Base):
    """
    Delivery robots. We have 5 bots.
    Each can carry maximum 3 orders.
    """
    __tablename__ = "bots"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    status = Column(Enum(BotStatus), default=BotStatus.AVAILABLE)
    current_x = Column(Integer, default=4)  # Start at center (4,4)
    current_y = Column(Integer, default=4)
    current_orders_count = Column(Integer, default=0)  # Max 3
    total_deliveries = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


# ============  4: restaurants ============

class Restaurant(Base):
    """
    Food restaurants on the map.
    Each restaurant is located at a specific node.
    """
    __tablename__ = "restaurants"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    restaurant_type = Column(Enum(RestaurantType), nullable=False)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# ============  5: orders ============

class Order(Base):
    """
    Customer delivery orders.
    Links: restaurant -> bot -> delivery location
    """
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Customer info
    customer_name = Column(String(100), nullable=False)
    customer_address = Column(String(200), nullable=False)
    
    # Locations (foreign keys to nodes table)
    pickup_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    delivery_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    
    # Relationships
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=True)  # Null until assigned
    
    # Status
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    
    # Route info
    estimated_time = Column(Integer, nullable=True)  # Seconds
    route_distance = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    assigned_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
