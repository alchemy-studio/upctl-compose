-- Create gitea user and database (AuthCore tables are managed by Diesel migrations)
CREATE USER gitea WITH PASSWORD 'gitea_dev' CREATEDB;
CREATE DATABASE gitea WITH OWNER gitea;
