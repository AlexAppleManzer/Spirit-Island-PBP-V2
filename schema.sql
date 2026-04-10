-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  player_ids INTEGER[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  current_phase VARCHAR(20) DEFAULT 'growth',
  round INTEGER DEFAULT 1,
  discord_webhook_url VARCHAR(500)
);

-- Game snapshots
CREATE TABLE game_snapshots (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  board_state JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game checkpoints
CREATE TABLE game_checkpoints (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  checkpoint_name VARCHAR(100),
  board_state JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_player_id INTEGER REFERENCES users(id),
  is_auto BOOLEAN DEFAULT FALSE,
  phase VARCHAR(20)
);