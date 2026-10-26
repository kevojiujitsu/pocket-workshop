PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS players (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL,
 bolts INTEGER NOT NULL DEFAULT 5,
 undos INTEGER NOT NULL DEFAULT 3
);
CREATE TABLE IF NOT EXISTS purchase_receipts (
 proof_key TEXT PRIMARY KEY,
 player_id TEXT NOT NULL REFERENCES players(id),
 platform TEXT NOT NULL CHECK(platform IN ('google','apple')),
 product_id TEXT NOT NULL,
 currency TEXT NOT NULL CHECK(currency IN ('bolts','undos')),
 quantity INTEGER NOT NULL CHECK(quantity > 0),
 proof_ciphertext TEXT NOT NULL,
 verified_at INTEGER NOT NULL,
 refunded INTEGER NOT NULL DEFAULT 0 CHECK(refunded IN (0,1))
);
CREATE INDEX IF NOT EXISTS receipt_rechecks ON purchase_receipts(refunded,verified_at);
CREATE TABLE IF NOT EXISTS wallet_events (
 id TEXT PRIMARY KEY,
 player_id TEXT NOT NULL REFERENCES players(id),
 currency TEXT NOT NULL CHECK(currency IN ('bolts','undos')),
 amount INTEGER NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('purchase','spend','refund')),
 receipt_key TEXT REFERENCES purchase_receipts(proof_key),
 created_at INTEGER NOT NULL,
 CHECK((kind='purchase' AND amount>0) OR (kind='spend' AND amount=-1) OR (kind='refund' AND amount<0)),
 UNIQUE(receipt_key,kind)
);
CREATE TRIGGER IF NOT EXISTS check_spend BEFORE INSERT ON wallet_events
WHEN NEW.kind='spend'
BEGIN
 SELECT CASE WHEN (SELECT CASE NEW.currency WHEN 'bolts' THEN bolts ELSE undos END FROM players WHERE id=NEW.player_id)<1 THEN RAISE(ABORT,'INSUFFICIENT_BALANCE') END;
END;
CREATE TRIGGER IF NOT EXISTS apply_wallet_event AFTER INSERT ON wallet_events
BEGIN
 UPDATE players SET bolts=bolts+CASE WHEN NEW.currency='bolts' THEN NEW.amount ELSE 0 END,
 undos=undos+CASE WHEN NEW.currency='undos' THEN NEW.amount ELSE 0 END WHERE id=NEW.player_id;
END;
CREATE TABLE IF NOT EXISTS session_limits (
 bucket TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
