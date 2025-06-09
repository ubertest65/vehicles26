-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Insert default roles
INSERT INTO roles (name) VALUES ('admin'), ('driver') ON CONFLICT (name) DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  license_plate TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  status TEXT CHECK (status IN ('aktiv', 'inaktiv')) NOT NULL DEFAULT 'aktiv'
);

-- Create vehicle_entries table
CREATE TABLE IF NOT EXISTS vehicle_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  mileage INTEGER NOT NULL CHECK (mileage >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, vehicle_id, created_at)
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER REFERENCES vehicle_entries(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  photo_type TEXT CHECK (
    photo_type IN (
      'vorne_links',
      'vorne_rechts', 
      'hinten_links',
      'hinten_rechts',
      'optional'
    )
  ) NOT NULL
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', true) ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for storage
CREATE POLICY "Allow authenticated users to upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'vehicle-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public read access to photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-photos');
