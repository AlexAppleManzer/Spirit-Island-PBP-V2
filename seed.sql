-- Seed data for local development
INSERT INTO users (username, email, password_hash)
VALUES ('test', 'test@test.com', '$2b$10$3yh/al4TLjt1FEroKcDCYO58HC3kXzEsmprQkB4PvuRSQ.LUuVkL2')
ON CONFLICT (email) DO NOTHING;
