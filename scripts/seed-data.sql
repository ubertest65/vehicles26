-- Insert sample admin user (password: admin123)
INSERT INTO users (username, password_hash, role_id) 
VALUES ('admin', 'admin123', (SELECT id FROM roles WHERE name = 'admin'))
ON CONFLICT (username) DO NOTHING;

-- Insert sample driver users
INSERT INTO users (username, password_hash, role_id) 
VALUES 
  ('driver1', 'driver123', (SELECT id FROM roles WHERE name = 'driver')),
  ('driver2', 'driver123', (SELECT id FROM roles WHERE name = 'driver'))
ON CONFLICT (username) DO NOTHING;

-- Insert sample vehicles
INSERT INTO vehicles (license_plate, model, status) 
VALUES 
  ('ABC-123', 'Ford Transit', 'aktiv'),
  ('DEF-456', 'Mercedes Sprinter', 'aktiv'),
  ('GHI-789', 'Volkswagen Crafter', 'aktiv')
ON CONFLICT (license_plate) DO NOTHING;
