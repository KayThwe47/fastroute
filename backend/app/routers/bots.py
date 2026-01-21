from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bot, BotStatus

router = APIRouter(prefix="/api/bots", tags=["Bots"])


@router.get("/")
def get_all_bots(db: Session = Depends(get_db)):
    bots = db.query(Bot).all()
    return bots


@router.get("/available")
def get_available_bots(db: Session = Depends(get_db)):
    bots = db.query(Bot).filter(
        Bot.status.in_([BotStatus.AVAILABLE, BotStatus.BUSY]),
        Bot.current_orders_count < 3
    ).all()
    return bots


@router.get("/{bot_id}")
def get_bot(bot_id: int, db: Session = Depends(get_db)):
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    return bot


@router.put("/{bot_id}/position")
def update_bot_position(
    bot_id: int,
    x: int,
    y: int,
    db: Session = Depends(get_db)
):
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    if not (0 <= x <= 8 and 0 <= y <= 8):
        raise HTTPException(status_code=400, detail="Position must be 0-8")
    
    bot.current_x = x
    bot.current_y = y
    
    db.commit()
    
    return {"message": f"Bot {bot_id} moved to ({x}, {y})"}


@router.put("/{bot_id}/status/{new_status}")
def update_bot_status(
    bot_id: int,
    new_status: str,
    db: Session = Depends(get_db)
):
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    try:
        status_enum = BotStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
    
    bot.status = status_enum
    db.commit()
    
    return {"message": f"Bot {bot_id} status updated to {new_status}"}
