from sqlalchemy.orm import Session
from app.models import Node, BlockedPath, Bot, Restaurant, BotStatus, RestaurantType


# blocked paths from BlockedPaths.csv
BLOCKED_PATHS = [
    (4, 12), (6, 14), (8, 16), (9, 17), (10, 18),
    (17, 18), (23, 24), (26, 27), (27, 28), (35, 36),
    (38, 39), (43, 44), (49, 50), (50, 51), (54, 55),
    (55, 56), (52, 61), (54, 63), (72, 73),
]

# restaurant locations: (node_id, type, name)
RESTAURANTS = [
    (10, RestaurantType.RAMEN, "Ramen Ichiban"),
    (21, RestaurantType.CURRY, "Curry Palace"),
    (44, RestaurantType.PIZZA, "Pizza Italia"),
    (40, RestaurantType.SUSHI, "Sushi Master"),
    (61, RestaurantType.SUSHI, "Ocean Sushi"),
    (74, RestaurantType.PIZZA, "Napoli Express"),
]

# delivery points (houses) - node IDs
DELIVERY_POINTS = [0, 1, 5, 8, 18, 25, 57, 63, 71]

# bot names
BOT_NAMES = ["Bot 1", "Bot 2", "Bot 3", "Bot 4", "Bot 5"]


def seed_database(db: Session):

    # check if already seeded
    if db.query(Node).count() > 0:
        print("Database already has data. Skipping seed.")
        return
    
    print("Seeding database...")
    
    # === 1: create 81 nodes (9x9 grid) ===
    print("Creating nodes...")
    for y in range(9):
        for x in range(9):
            node_id = y * 9 + x  # Calculate ID from position
            
            # Check if this node is a delivery point
            is_delivery = node_id in DELIVERY_POINTS
            
            # Check if this node has a restaurant
            restaurant_info = next(
                (r for r in RESTAURANTS if r[0] == node_id), 
                None
            )
            is_restaurant = restaurant_info is not None
            restaurant_type = restaurant_info[1].value if restaurant_info else None
            
            node = Node(
                id=node_id,
                x=x,
                y=y,
                is_delivery_point=is_delivery,
                is_restaurant=is_restaurant,
                restaurant_type=restaurant_type
            )
            db.add(node)
    
    db.commit()
    print(f"Created 81 nodes!")
    
    # === 2: create blocked paths ===
    print("Creating blocked paths...")
    for from_id, to_id in BLOCKED_PATHS:
        blocked = BlockedPath(from_node_id=from_id, to_node_id=to_id)
        db.add(blocked)
    
    db.commit()
    print(f"Created {len(BLOCKED_PATHS)} blocked paths!")
    
    # === 3: create restaurants ===
    print("Creating restaurants...")
    for node_id, rtype, name in RESTAURANTS:
        restaurant = Restaurant(
            name=name,
            restaurant_type=rtype,
            node_id=node_id,
            is_active=True
        )
        db.add(restaurant)
    
    db.commit()
    print(f"Created {len(RESTAURANTS)} restaurants!")
    
    # === 4: create 5 bots ===
    print("Creating bots...")
    for name in BOT_NAMES:
        bot = Bot(
            name=name,
            status=BotStatus.AVAILABLE,
            current_x=4,  # Start at center
            current_y=4,
            current_orders_count=0,
            total_deliveries=0
        )
        db.add(bot)
    
    db.commit()
    print(f"Created {len(BOT_NAMES)} bots!")
    
    print("Database seeding complete!")
