import os
import socket
import logging
from threading import Lock
from typing import Optional, Dict
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship, Session, declarative_base
import jwt

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./db/pacex.db')
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

SR201_HOST = os.environ.get('SR201_HOST', '192.168.199.250')
SR201_PORT = int(os.environ.get('SR201_PORT', '6722'))
SR201_SWITCHES = int(os.environ.get('SR201_SWITCHES', '8'))
SR201_TIMEOUT = float(os.environ.get('SR201_TIMEOUT', '1'))

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

class PinsIn(BaseModel):
  pins: Dict[str, str] = Field(default_factory=dict)

class RelayCommandIn(BaseModel):
  relay: int
  enabled: Optional[bool] = None
  command: Optional[str] = None
  host: Optional[str] = None
  port: Optional[int] = None

class RelayController:
  """
  Controller for SR-201 relay module.

  Commands:
  - 1X enables relay #X
  - 2X disables relay #X
  """

  def __init__(self, host: str = SR201_HOST, port: int = SR201_PORT, switches: int = SR201_SWITCHES, timeout: float = SR201_TIMEOUT):
    self.host = host
    self.port = port
    self.switches = switches
    self.timeout = timeout

    # Try to disable all relays on initialization, but don't fail if device is unavailable.
    for i in range(switches):
      try:
        self.disable_relay(i + 1)
      except Exception as exc:
        logger.warning(f'Could not disable relay {i + 1} during initialization: {exc}')

  def _send_command(self, command: bytes) -> Optional[bytes]:
    """Send a command to the relay and return the response."""
    try:
      with socket.create_connection((self.host, self.port), timeout=self.timeout) as relay_socket:
        relay_socket.sendall(command)
        return relay_socket.recv(1024)
    except (socket.timeout, socket.error, OSError) as exc:
      logger.warning(f'Failed to send command to relay at {self.host}:{self.port}: {exc}')
      return None

  def enable_relay(self, relay: int) -> Optional[bytes]:
    """Enable a specific relay (1-indexed)."""
    if relay < 1 or relay > self.switches:
      raise ValueError(f'Relay must be between 1 and {self.switches}')
    command = f'1{relay}'.encode()
    return self._send_command(command)

  def disable_relay(self, relay: int) -> Optional[bytes]:
    """Disable a specific relay (1-indexed)."""
    if relay < 1 or relay > self.switches:
      raise ValueError(f'Relay must be between 1 and {self.switches}')
    command = f'2{relay}'.encode()
    return self._send_command(command)


relay_controller = RelayController()
relay_lock = Lock()

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
def put_pins(payload: PinsIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
  pins = payload.pins
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

def resolve_relay_enabled(payload: RelayCommandIn) -> bool:
  if payload.enabled is not None:
    return payload.enabled
  if payload.command:
    command = payload.command.strip().upper()
    if command.startswith('1'):
      return True
    if command.startswith('2'):
      return False
  raise HTTPException(status_code=400, detail='Provide either enabled (bool) or command (1X/2X style).')

@app.post('/relay/command')
def relay_command(payload: RelayCommandIn):
  if payload.host and payload.host != SR201_HOST:
    logger.warning(f'Ignoring payload host {payload.host}; using configured relay host {SR201_HOST}.')
  if payload.port and payload.port != SR201_PORT:
    logger.warning(f'Ignoring payload port {payload.port}; using configured relay port {SR201_PORT}.')

  enabled = resolve_relay_enabled(payload)

  try:
    with relay_lock:
      response = relay_controller.enable_relay(payload.relay) if enabled else relay_controller.disable_relay(payload.relay)
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc))
  except Exception as exc:
    logger.exception(f'Unexpected relay bridge failure: {exc}')
    raise HTTPException(status_code=500, detail='Relay bridge failure')

  if response is None:
    raise HTTPException(status_code=502, detail='No response from SR201 relay device')

  return {
    'ok': True,
    'host': SR201_HOST,
    'port': SR201_PORT,
    'relay': payload.relay,
    'enabled': enabled,
    'response_hex': response.hex(),
  }

@app.get('/')
def root():
  return {'status': 'ok'}
