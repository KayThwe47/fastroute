from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Restaurant, Node

router = APIRouter(prefix="/api/restaurants", tags=["Restaurants"])


@router.get("/")
def get_all_restaurants(db: Session = Depends(get_db)):
    restaurants = db.query(Restaurant).filter(Restaurant.is_active == True).all()
    return restaurants


@router.get("/{restaurant_id}")
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    return restaurant


@router.get("/type/{restaurant_type}")
def get_restaurants_by_type(restaurant_type: str, db: Session = Depends(get_db)):
    restaurants = db.query(Restaurant).filter(
        Restaurant.restaurant_type == restaurant_type.upper(),
        Restaurant.is_active == True
    ).all()
    return restaurants


@router.get("/{restaurant_id}/location")
def get_restaurant_location(restaurant_id: int, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    node = db.query(Node).filter(Node.id == restaurant.node_id).first()
    
    return {
        "restaurant": restaurant.name,
        "node_id": restaurant.node_id,
        "x": node.x,
        "y": node.y
    }
