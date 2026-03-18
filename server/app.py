import os
from typing import Optional, Dict
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship, Session, declarative_base
import jwt

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./db/pacex.db')
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

connect_args = {}
if DATABASE_URL.startswith('sqlite'):
  connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
  __tablename__ = 'users'
  id = Column(String, primary_key=True, index=True)
  email = Column(String, unique=True, index=True)
  name = Column(String)
  password = Column(String)

class Pin(Base):
  __tablename__ = 'pins'
  door = Column(Integer, primary_key=True)
  pin = Column(String, nullable=False)

class Package(Base):
  __tablename__ = 'packages'
  tracking_number = Column(String, primary_key=True, index=True)
  recipient_name = Column(String)
  status = Column(String)
  last_update = Column(DateTime)
  origin = Column(String)
  destination = Column(String)

class PackageEvent(Base):
  __tablename__ = 'package_events'
  id = Column(Integer, primary_key=True, autoincrement=True)
  tracking_number = Column(String, ForeignKey('packages.tracking_number'))
  event_time = Column(DateTime)
  location = Column(String)
  message = Column(String)

Package.events = relationship('PackageEvent', backref='package')

Base.metadata.create_all(bind=engine)

app = FastAPI(title='PaceX Mock API')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

class LoginIn(BaseModel):
  email: str
  password: str

class TokenResp(BaseModel):
  access_token: str
  token_type: str = 'bearer'

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
  to_encode = data.copy()
  expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
  to_encode.update({'exp': expire})
  return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> str:
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    sub = payload.get('sub')
    if not sub:
      raise HTTPException(status_code=401, detail='Invalid token')
    return sub
  except jwt.ExpiredSignatureError:
    raise HTTPException(status_code=401, detail='Token expired')
  except Exception:
    raise HTTPException(status_code=401, detail='Invalid token')

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()

@app.post('/login', response_model=TokenResp)
def login(payload: LoginIn, db: Session = Depends(get_db)):
  user = db.query(User).filter(User.email == payload.email).first()
  if not user or user.password != payload.password:
    raise HTTPException(status_code=401, detail='Invalid credentials')
  token = create_access_token({'sub': user.email})
  return {'access_token': token}

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
  if not authorization:
    raise HTTPException(status_code=401, detail='Missing Authorization header')
  parts = authorization.split()
  if len(parts) != 2 or parts[0].lower() != 'bearer':
    raise HTTPException(status_code=401, detail='Invalid Authorization header')
  token = parts[1]
  email = verify_token(token)
  user = db.query(User).filter(User.email == email).first()
  if not user:
    raise HTTPException(status_code=401, detail='User not found')
  return user

@app.get('/pins')
def get_pins(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
  pins = db.query(Pin).all()
  return {'pins': {str(p.door): p.pin for p in pins}}

@app.put('/pins')
def put_pins(payload: Dict[str, str], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
  pins = payload.get('pins', {})
  for door_str, pin in pins.items():
    try:
      door = int(door_str)
    except Exception:
      continue
    row = db.query(Pin).filter(Pin.door == door).first()
    if row:
      row.pin = pin
    else:
      db.add(Pin(door=door, pin=pin))
  db.commit()
  pins = db.query(Pin).all()
  return {'pins': {str(p.door): p.pin for p in pins}}

@app.post('/pins/verify')
def verify_pin(payload: Dict[str, str], db: Session = Depends(get_db)):
  pin = payload.get('pin')
  if not pin:
    raise HTTPException(status_code=400, detail='Missing pin')
  row = db.query(Pin).filter(Pin.pin == pin).first()
  if row:
    return {'valid': True, 'door': row.door}
  return {'valid': False, 'door': None}

@app.get('/')
def root():
  return {'status': 'ok'}
