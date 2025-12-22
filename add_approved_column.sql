-- Add approved column to users table
-- This column controls whether a user can access the application panels
-- Default is FALSE for all new users (requires admin approval)

ALTER TABLE users 
ADD COLUMN approved BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: If you want to approve existing users automatically, uncomment:
-- UPDATE users SET approved = TRUE;
