-- RBAC + Knowledge Source Control (PostgreSQL)
-- Safe to run multiple times where possible.

-- 1) users.user_role (admin/user)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_role TEXT;

UPDATE users
SET user_role = 'user'
WHERE user_role IS NULL OR btrim(user_role) = '';

ALTER TABLE users
ALTER COLUMN user_role SET DEFAULT 'user';

ALTER TABLE users
ALTER COLUMN user_role SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_users_user_role_admin_user'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT ck_users_user_role_admin_user
        CHECK (user_role IN ('admin', 'user'));
    END IF;
END $$;

-- 2) knowledge_sources registry (controls retrieval eligibility)
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_knowledge_sources_source_ref
    ON knowledge_sources (source_ref);

-- 3) admin audit trail (optional but recommended)
CREATE TABLE IF NOT EXISTS knowledge_source_audit (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    source_id INTEGER NULL REFERENCES knowledge_sources(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_knowledge_source_audit_admin_user_id
    ON knowledge_source_audit (admin_user_id);

CREATE INDEX IF NOT EXISTS ix_knowledge_source_audit_source_id
    ON knowledge_source_audit (source_id);
