#!/usr/bin/env bash
set -euo pipefail

##############################################################################
# setup_database_ubuntu.sh
#
# Single, robust script to install and initialize a local database on Ubuntu
#  - Supports: postgres (recommended) or sqlite
#  - Installs packages, creates DB/user, loads schema & seeds, writes .env
#
# Usage examples:
#   sudo ./scripts/setup_database_ubuntu.sh --engine=postgres --db-pass=secret
#   ./scripts/setup_database_ubuntu.sh --engine=sqlite --project-root=.
##############################################################################

info(){ printf "\e[1;34m[INFO]\e[0m %s\n" "$*"; }
warn(){ printf "\e[1;33m[WARN]\e[0m %s\n" "$*"; }
err(){ printf "\e[1;31m[ERROR]\e[0m %s\n" "$*"; }

# initialize command trackers for traps to avoid unbound variable errors when
# running with `set -u` (treat unset variables as errors)
current_cmd=""
last_cmd=""

trap 'last_cmd="${current_cmd:-}"; current_cmd="${BASH_COMMAND:-}"' DEBUG
trap 'err "Command failed: ${last_cmd:-}"; exit 1' ERR

usage(){
  cat <<EOF
Usage: $0 [options]

Options:
  --engine=postgres|sqlite   Database engine to install/setup (default: postgres)
  --db-name=NAME             Database name (postgres) or ignored for sqlite (default: pacex_db)
  --db-user=USER             DB user for Postgres (default: pacex_user)
  --db-pass=PASSWORD         DB password for Postgres (default: change_me)
  --project-root=PATH        Where to write .env and sqlite db (default: current dir)
  --vite-api-url=URL         Vite frontend API URL to write to .env (default: http://localhost:8000)
  --force                    Replace existing DB/role without prompt
  --non-interactive          Assume yes for prompts
  -h, --help                 Show this help

Example:
  sudo $0 --engine=postgres --db-pass='S3cret!'
  $0 --engine=sqlite --project-root=.
EOF
  exit 1
}

# Defaults
ENGINE="postgres"
DB_NAME="pacex_db"
DB_USER="pacex_user"
DB_PASS="change_me"
PROJECT_ROOT="$(pwd)"
VITE_API_URL="http://localhost:8000"
FORCE="no"
NONINTERACTIVE="no"

# parse args (basic long-opt support)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --engine=*) ENGINE="${1#*=}" ; shift ;;
    --engine) ENGINE="$2"; shift 2 ;;
    --db-name=*) DB_NAME="${1#*=}"; shift ;;
    --db-name) DB_NAME="$2"; shift 2 ;;
    --db-user=*) DB_USER="${1#*=}"; shift ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    --db-pass=*) DB_PASS="${1#*=}"; shift ;;
    --db-pass) DB_PASS="$2"; shift 2 ;;
    --project-root=*) PROJECT_ROOT="${1#*=}"; shift ;;
    --project-root) PROJECT_ROOT="$2"; shift 2 ;;
    --vite-api-url=*) VITE_API_URL="${1#*=}"; shift ;;
    --vite-api-url) VITE_API_URL="$2"; shift 2 ;;
    --force) FORCE="yes"; shift ;;
    --non-interactive) NONINTERACTIVE="yes"; shift ;;
    -h|--help) usage ;;
    *) err "Unknown option: $1"; usage ;;
  esac
done

if [[ "$ENGINE" != "postgres" && "$ENGINE" != "sqlite" ]]; then
  err "Unsupported engine: $ENGINE"; exit 1
fi

# Determine sudo usage (we prefix privileged commands with sudo when needed)
SUDO=""
if (( EUID != 0 )); then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    err "This script requires root privileges or sudo."; exit 1
  fi
fi

confirm(){
  if [[ "$NONINTERACTIVE" == "yes" ]]; then return 0; fi
  read -r -p "$1 [y/N]: " _ans
  case "$_ans" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

# helpers to safely quote SQL values/idents
sql_escape(){ printf "%s" "$1" | sed "s/'/''/g"; }
ident_escape(){ local s="$1"; s="${s//\"/\"\"}"; printf '"%s"' "$s"; }

info "Project root: $PROJECT_ROOT"
info "Engine: $ENGINE"

if [[ "$ENGINE" == "postgres" ]]; then
  # Install PostgreSQL if needed
  if ! command -v psql >/dev/null 2>&1; then
    info "Installing PostgreSQL..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y postgresql postgresql-contrib ca-certificates || { err "apt install failed"; exit 1; }
  else
    info "psql already installed, skipping apt install"
  fi

  info "Ensuring postgresql service is running..."
  $SUDO systemctl enable --now postgresql
  # wait for active
  for i in {1..30}; do
    if $SUDO systemctl is-active --quiet postgresql; then break; fi
    sleep 1
  done
  if ! $SUDO systemctl is-active --quiet postgresql; then
    err "postgresql service failed to start"; exit 1
  fi

  # Prepare escaped values
  ESC_USER=$(ident_escape "$DB_USER")
  ESC_PASS=$(sql_escape "$DB_PASS")
  ESC_DB=$(ident_escape "$DB_NAME")

  # Create role
  exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | tr -d '[:space:]' || true)
  if [[ "$exists" == "1" ]]; then
    if [[ "$FORCE" == "yes" ]]; then
      info "Dropping existing role $DB_USER (force)"
      sudo -u postgres psql -c "DROP ROLE IF EXISTS ${ESC_USER};"
    else
      info "Role $DB_USER already exists. Use --force to recreate or provide a different --db-user."
    fi
  fi

  if [[ "$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | tr -d '[:space:]' || true)" != "1" ]]; then
    info "Creating role $DB_USER"
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${ESC_USER} WITH LOGIN PASSWORD '${ESC_PASS}';"
  fi

  # Create database
  exists_db=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | tr -d '[:space:]' || true)
  if [[ "$exists_db" == "1" ]]; then
    if [[ "$FORCE" == "yes" ]]; then
      info "Dropping existing database $DB_NAME (force)"
      sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${ESC_DB};"
    else
      info "Database $DB_NAME already exists. Use --force to recreate. Skipping creation."
    fi
  fi

  if [[ "$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | tr -d '[:space:]' || true)" != "1" ]]; then
    info "Creating database $DB_NAME owned by $DB_USER"
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${ESC_DB} OWNER ${ESC_USER};"
  fi

  # Schema
  info "Applying schema to $DB_NAME"
  TMP_SCHEMA=$(mktemp)
  cat > "$TMP_SCHEMA" <<'SQL'
-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password TEXT NOT NULL
);

-- pins
CREATE TABLE IF NOT EXISTS pins (
  door INTEGER PRIMARY KEY,
  pin TEXT NOT NULL
);

-- packages
CREATE TABLE IF NOT EXISTS packages (
  tracking_number TEXT PRIMARY KEY,
  recipient_name TEXT,
  status TEXT,
  last_update TIMESTAMPTZ,
  origin TEXT,
  destination TEXT
);

-- package_events
CREATE TABLE IF NOT EXISTS package_events (
  id SERIAL PRIMARY KEY,
  tracking_number TEXT NOT NULL REFERENCES packages(tracking_number) ON DELETE CASCADE,
  event_time TIMESTAMPTZ,
  location TEXT,
  message TEXT
);
SQL

  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$TMP_SCHEMA"
  rm -f "$TMP_SCHEMA"

  # Seeds
  info "Seeding basic data"
  TMP_SEED=$(mktemp)
  cat > "$TMP_SEED" <<SQL
-- users
INSERT INTO users (id, email, name, password) VALUES
('u1','alice@example.com','Alice','alice123'),
('u2','bob@example.com','Bob','bob12345'),
('u3','carol@example.com','Carol','carolpass')
ON CONFLICT DO NOTHING;

-- pins (defaultPins)
INSERT INTO pins (door, pin) VALUES
(1,'1111'),(2,'2222'),(3,'3333'),(4,'4444'),
(5,'5555'),(6,'6666'),(7,'7777'),(8,'8888')
ON CONFLICT DO NOTHING;

-- packages & events (small sample)
INSERT INTO packages (tracking_number, recipient_name, status, last_update, origin, destination) VALUES
('GLS123456789','Alice','In Transit','2026-01-05T15:22:00Z','Budapest, HU','Vienna, AT')
ON CONFLICT DO NOTHING;

INSERT INTO package_events (tracking_number,event_time,location,message) VALUES
('GLS123456789','2026-01-03T08:00:00Z','Budapest Hub','Parcel registered'),
('GLS123456789','2026-01-04T10:40:00Z','Budapest Hub','Parcel sorted'),
('GLS123456789','2026-01-05T15:22:00Z','Győr Depot','Departed facility')
ON CONFLICT DO NOTHING;
SQL

  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$TMP_SEED"
  rm -f "$TMP_SEED"

  info "Verifying..."
  sudo -u postgres psql -d "$DB_NAME" -c "SELECT 'users:' as what, count(*) FROM users;"
  sudo -u postgres psql -d "$DB_NAME" -c "SELECT 'pins:' as what, count(*) FROM pins;"

  # Write .env
  ENV_FILE="$PROJECT_ROOT/.env"
  if [[ -f "$ENV_FILE" && "$FORCE" != "yes" ]]; then
    if confirm ".env already exists in $PROJECT_ROOT. Overwrite?"; then
      :
    else
      warn "Skipping .env write"
      info "Database setup complete. Postgres DB: $DB_NAME. USER: $DB_USER"
      DB_SETUP_DONE="postgres"
    fi
  fi

  if [[ -z "${DB_SETUP_DONE:-}" ]]; then
    info "Writing .env to $ENV_FILE"
    cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql://${DB_USER}:$DB_PASS@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME}
VITE_API_URL=${VITE_API_URL}
EOF
    info "Postgres setup finished. DATABASE_URL written to $ENV_FILE"
    DB_SETUP_DONE="postgres"
  fi
while [[ $# -gt 0 ]]; do
  case "$1" in
    --engine=*) ENGINE="${1#*=}" ; shift ;;
    --engine) ENGINE="$2"; shift 2 ;;
    --db-name=*) DB_NAME="${1#*=}"; shift ;;
    --db-name) DB_NAME="$2"; shift 2 ;;
    --db-user=*) DB_USER="${1#*=}"; shift ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    --db-pass=*) DB_PASS="${1#*=}"; shift ;;
    --db-pass) DB_PASS="$2"; shift 2 ;;
    --project-root=*) PROJECT_ROOT="${1#*=}"; shift ;;
    --project-root) PROJECT_ROOT="$2"; shift 2 ;;
    --vite-api-url=*) VITE_API_URL="${1#*=}"; shift ;;
    --vite-api-url) VITE_API_URL="$2"; shift 2 ;;
    --force) FORCE="yes"; shift ;;
    --non-interactive) NONINTERACTIVE="yes"; shift ;;
    -h|--help) usage ;;
    *) err "Unknown option: $1"; usage ;;
  esac
done

if [[ "$ENGINE" != "postgres" && "$ENGINE" != "sqlite" ]]; then
  err "Unsupported engine: $ENGINE"; exit 1
fi

# Determine sudo usage (we prefix privileged commands with sudo when needed)
SUDO=""
if (( EUID != 0 )); then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    err "This script requires root privileges or sudo."; exit 1
  fi
fi

confirm(){
  if [[ "$NONINTERACTIVE" == "yes" ]]; then return 0; fi
  read -r -p "$1 [y/N]: " _ans
  case "$_ans" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

# helpers to safely quote SQL values/idents
sql_escape(){ printf "%s" "$1" | sed "s/'/''/g"; }
ident_escape(){ local s="$1"; s="${s//\"/\"\"}"; printf '"%s"' "$s"; }

info "Project root: $PROJECT_ROOT"
info "Engine: $ENGINE"

if [[ "$ENGINE" == "postgres" ]]; then
  # Install PostgreSQL if needed
  if ! command -v psql >/dev/null 2>&1; then
    info "Installing PostgreSQL..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y postgresql postgresql-contrib ca-certificates || { err "apt install failed"; exit 1; }
  else
    info "psql already installed, skipping apt install"
  fi

  info "Ensuring postgresql service is running..."
  $SUDO systemctl enable --now postgresql
  # wait for active
  for i in {1..30}; do
    if $SUDO systemctl is-active --quiet postgresql; then break; fi
    sleep 1
  done
  if ! $SUDO systemctl is-active --quiet postgresql; then
    err "postgresql service failed to start"; exit 1
  fi

  # Prepare escaped values
  ESC_USER=$(ident_escape "$DB_USER")
  ESC_PASS=$(sql_escape "$DB_PASS")
  ESC_DB=$(ident_escape "$DB_NAME")

  # Create role
  exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | tr -d '[:space:]' || true)
  if [[ "$exists" == "1" ]]; then
    if [[ "$FORCE" == "yes" ]]; then
      info "Dropping existing role $DB_USER (force)"
      sudo -u postgres psql -c "DROP ROLE IF EXISTS ${ESC_USER};"
    else
      info "Role $DB_USER already exists. Use --force to recreate or provide a different --db-user."
    fi
  fi

  if [[ "$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | tr -d '[:space:]' || true)" != "1" ]]; then
    info "Creating role $DB_USER"
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${ESC_USER} WITH LOGIN PASSWORD '${ESC_PASS}';"
  fi

  # Create database
  exists_db=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | tr -d '[:space:]' || true)
  if [[ "$exists_db" == "1" ]]; then
    if [[ "$FORCE" == "yes" ]]; then
      info "Dropping existing database $DB_NAME (force)"
      sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${ESC_DB};"
    else
      info "Database $DB_NAME already exists. Use --force to recreate. Skipping creation."
    fi
  fi

  if [[ "$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | tr -d '[:space:]' || true)" != "1" ]]; then
    info "Creating database $DB_NAME owned by $DB_USER"
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${ESC_DB} OWNER ${ESC_USER};"
  fi

  # Schema
  info "Applying schema to $DB_NAME"
  TMP_SCHEMA=$(mktemp)
  cat > "$TMP_SCHEMA" <<'SQL'
-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password TEXT NOT NULL
);

-- pins
CREATE TABLE IF NOT EXISTS pins (
  door INTEGER PRIMARY KEY,
  pin TEXT NOT NULL
);

-- packages
CREATE TABLE IF NOT EXISTS packages (
  tracking_number TEXT PRIMARY KEY,
  recipient_name TEXT,
  status TEXT,
  last_update TIMESTAMPTZ,
  origin TEXT,
  destination TEXT
);

-- package_events
CREATE TABLE IF NOT EXISTS package_events (
  id SERIAL PRIMARY KEY,
  tracking_number TEXT NOT NULL REFERENCES packages(tracking_number) ON DELETE CASCADE,
  event_time TIMESTAMPTZ,
  location TEXT,
  message TEXT
);
SQL

  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$TMP_SCHEMA"
  rm -f "$TMP_SCHEMA"

  # Seeds
  info "Seeding basic data"
  TMP_SEED=$(mktemp)
  cat > "$TMP_SEED" <<SQL
-- users
INSERT INTO users (id, email, name, password) VALUES
('u1','alice@example.com','Alice','alice123'),
('u2','bob@example.com','Bob','bob12345'),
('u3','u3','Carol','carolpass')
ON CONFLICT DO NOTHING;

-- pins (defaultPins)
INSERT INTO pins (door, pin) VALUES
(1,'1111'),(2,'2222'),(3,'3333'),(4,'4444'),
(5,'5555'),(6,'6666'),(7,'7777'),(8,'8888')
ON CONFLICT DO NOTHING;

-- packages & events (small sample)
INSERT INTO packages (tracking_number, recipient_name, status, last_update, origin, destination) VALUES
('GLS123456789','Alice','In Transit','2026-01-05T15:22:00Z','Budapest, HU','Vienna, AT')
ON CONFLICT DO NOTHING;

INSERT INTO package_events (tracking_number,event_time,location,message) VALUES
('GLS123456789','2026-01-03T08:00:00Z','Budapest Hub','Parcel registered'),
('GLS123456789','2026-01-04T10:40:00Z','Budapest Hub','Parcel sorted'),
('GLS123456789','2026-01-05T15:22:00Z','Győr Depot','Departed facility')
ON CONFLICT DO NOTHING;
SQL

  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$TMP_SEED"
  rm -f "$TMP_SEED"

  info "Verifying..."
  sudo -u postgres psql -d "$DB_NAME" -c "SELECT 'users:' as what, count(*) FROM users;"
  sudo -u postgres psql -d "$DB_NAME" -c "SELECT 'pins:' as what, count(*) FROM pins;"

  # Write .env
  ENV_FILE="$PROJECT_ROOT/.env"
  if [[ -f "$ENV_FILE" && "$FORCE" != "yes" ]]; then
    if confirm ".env already exists in $PROJECT_ROOT. Overwrite?"; then
      :
    else
      warn "Skipping .env write"
      info "Database setup complete. Postgres DB: $DB_NAME. USER: $DB_USER"
      exit 0
    fi
  fi

  info "Writing .env to $ENV_FILE"
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql://${DB_USER}:$DB_PASS@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME}
VITE_API_URL=${VITE_API_URL}
EOF

  info "Postgres setup finished. DATABASE_URL written to $ENV_FILE"
  exit 0

elif [[ "$ENGINE" == "sqlite" ]]; then
  # SQLite flow
  if ! command -v sqlite3 >/dev/null 2>&1; then
    info "Installing sqlite3..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y sqlite3
  fi

  DB_DIR="$PROJECT_ROOT/db"
  mkdir -p "$DB_DIR"
  DB_PATH="$DB_DIR/pacex.db"

  if [[ -f "$DB_PATH" ]]; then
    if [[ "$FORCE" == "yes" ]]; then
      info "Removing existing sqlite DB (force)"
      rm -f "$DB_PATH"
    else
      info "SQLite DB already exists at $DB_PATH. Use --force to recreate."
    fi
  fi

  info "Creating sqlite DB at $DB_PATH"
  sqlite3 "$DB_PATH" "PRAGMA foreign_keys = ON;"

  info "Applying sqlite schema"
  sqlite3 "$DB_PATH" <<'SQL'
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pins (
  door INTEGER PRIMARY KEY,
  pin TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS packages (
  tracking_number TEXT PRIMARY KEY,
  recipient_name TEXT,
  status TEXT,
  last_update TEXT,
  origin TEXT,
  destination TEXT
);

CREATE TABLE IF NOT EXISTS package_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_number TEXT NOT NULL,
  event_time TEXT,
  location TEXT,
  message TEXT,
  FOREIGN KEY (tracking_number) REFERENCES packages(tracking_number) ON DELETE CASCADE
);
SQL

  info "Seeding sqlite DB"
  sqlite3 "$DB_PATH" <<SQL
INSERT OR IGNORE INTO users (id,email,name,password) VALUES
('u1','alice@example.com','Alice','alice123'),
('u2','bob@example.com','Bob','bob12345'),
('u3','carol@example.com','Carol','carolpass');

INSERT OR IGNORE INTO pins (door,pin) VALUES
(1,'1111'),(2,'2222'),(3,'3333'),(4,'4444'),(5,'5555'),(6,'6666'),(7,'7777'),(8,'8888');

INSERT OR IGNORE INTO packages (tracking_number,recipient_name,status,last_update,origin,destination) VALUES
('GLS123456789','Alice','In Transit','2026-01-05T15:22:00Z','Budapest, HU','Vienna, AT');

INSERT OR IGNORE INTO package_events (tracking_number,event_time,location,message) VALUES
('GLS123456789','2026-01-03T08:00:00Z','Budapest Hub','Parcel registered'),
('GLS123456789','2026-01-04T10:40:00Z','Budapest Hub','Parcel sorted'),
('GLS123456789','2026-01-05T15:22:00Z','Győr Depot','Departed facility');
SQL

  info "Verifying sqlite data"
  sqlite3 "$DB_PATH" "SELECT 'users:',COUNT(*) FROM users;"
  sqlite3 "$DB_PATH" "SELECT 'pins:',COUNT(*) FROM pins;"

  # Write .env
  ENV_FILE="$PROJECT_ROOT/.env"
  if [[ -f "$ENV_FILE" && "$FORCE" != "yes" ]]; then
    if confirm ".env already exists in $PROJECT_ROOT. Overwrite?"; then
      :
    else
      warn "Skipping .env write"
      info "SQLite setup complete. DB: $DB_PATH"
      exit 0
    fi
  fi

  info "Writing .env to $ENV_FILE"
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=sqlite:${DB_PATH}
VITE_API_URL=${VITE_API_URL}
EOF

    info "SQLite setup finished. DATABASE_URL written to $ENV_FILE"
    DB_SETUP_DONE="sqlite"
fi

  # ---------------------------------------------------------------------------
  # Server setup: create a minimal FastAPI server, virtualenv, install deps and
  # register a systemd service so the server auto-starts on boot.
  # ---------------------------------------------------------------------------

  if [[ -z "${DB_SETUP_DONE:-}" ]]; then
    err "Database setup did not complete; aborting server setup"
    exit 1
  fi

  RUN_USER="${SUDO_USER:-${USER}}"
  info "Server will be installed under: $PROJECT_ROOT/server and run as user: $RUN_USER"

  # Ensure python3 and venv tools are available
  if ! command -v python3 >/dev/null 2>&1; then
    info "Installing python3 and venv packages..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y python3 python3-venv python3-pip
  fi

  ENV_FILE="$PROJECT_ROOT/.env"
  if [[ ! -f "$ENV_FILE" ]]; then
    touch "$ENV_FILE"
  fi

  # Ensure SECRET_KEY exists
  if ! grep -q '^SECRET_KEY=' "$ENV_FILE" 2>/dev/null; then
    if command -v openssl >/dev/null 2>&1; then
    SECRET_KEY_VAL=$(openssl rand -hex 32)
    else
    SECRET_KEY_VAL=$(python3 - <<PY
  import secrets
  print(secrets.token_hex(32))
  PY
  )
    fi
    echo "SECRET_KEY=${SECRET_KEY_VAL}" >> "$ENV_FILE"
    info "Wrote SECRET_KEY to $ENV_FILE"
  fi

  SERVER_DIR="$PROJECT_ROOT/server"
  $SUDO mkdir -p "$SERVER_DIR"
  $SUDO chown -R "$RUN_USER":"$RUN_USER" "$PROJECT_ROOT"

  info "Creating server files in $SERVER_DIR"

  # requirements.txt
  REQ_FILE="$SERVER_DIR/requirements.txt"
  cat > "$REQ_FILE" <<REQ
  fastapi
  uvicorn[standard]
  SQLAlchemy
  PyJWT
  REQ

  if [[ "$ENGINE" == "postgres" ]]; then
    echo "psycopg2-binary" >> "$REQ_FILE"
  fi

  # app.py (minimal FastAPI server with auth + pins endpoints)
  APP_FILE="$SERVER_DIR/app.py"
  cat > "$APP_FILE" <<'PY'
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
  PY

  # Ensure ownership and venv creation under RUN_USER
  info "Creating virtualenv and installing Python dependencies"
  if [[ $(id -u) -eq 0 ]]; then
    $SUDO -u "$RUN_USER" python3 -m venv "$SERVER_DIR/venv"
    $SUDO -u "$RUN_USER" "$SERVER_DIR/venv/bin/pip" install --upgrade pip
    $SUDO -u "$RUN_USER" "$SERVER_DIR/venv/bin/pip" install -r "$REQ_FILE"
  else
    python3 -m venv "$SERVER_DIR/venv"
    "$SERVER_DIR/venv/bin/pip" install --upgrade pip
    "$SERVER_DIR/venv/bin/pip" install -r "$REQ_FILE"
  fi

  # Create systemd service
  SERVICE_FILE="/etc/systemd/system/pacex-server.service"
  info "Writing systemd service to $SERVICE_FILE"
  $SUDO tee "$SERVICE_FILE" > /dev/null <<SERVICE
  [Unit]
  Description=PaceX FastAPI Server
  After=network.target

  [Service]
  User=${RUN_USER}
  WorkingDirectory=${SERVER_DIR}
  EnvironmentFile=${ENV_FILE}
  ExecStart=${SERVER_DIR}/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
  Restart=always
  RestartSec=5

  [Install]
  WantedBy=multi-user.target
  SERVICE

  info "Reloading systemd and enabling service"
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now pacex-server.service || { warn "Failed to enable/start service via systemctl"; }

  info "Server setup complete. Service: pacex-server.service"
  exit 0
