INSERT INTO skills (name, category) VALUES
('Roof Panel Repair','ROOF'),('Wall Cladding Repair','CLADDING'),('Structure Repair','STRUCTURE'),('Gutter & Downpipe Repair','DRAINAGE'),
('Crane Support','INSTALLATION'),('Mezzanine Work','STRUCTURE'),('Leak Inspection','INSPECTION'),('Fastener Replacement','HARDWARE'),
('Painting / Protective Coating','FINISHING'),('General Maintenance','MAINTENANCE') ON CONFLICT (name) DO NOTHING;
INSERT INTO materials (name, code, unit, default_rate, category) VALUES
('Roof Panel','MAT-ROOF','pcs',900,'PANELS'),('Self Drilling Screw','MAT-SCREW','pcs',60,'HARDWARE'),('Silicone Sealant','MAT-SEAL','pcs',300,'SEALANTS'),
('Fasteners','MAT-FAST','pcs',80,'HARDWARE'),('Gutter Components','MAT-GUTTER','pcs',600,'DRAINAGE') ON CONFLICT (name) DO NOTHING;
INSERT INTO service_areas (name, city, state, latitude, longitude) VALUES
('Ahmedabad','Ahmedabad','Gujarat',23.0225,72.5714),('Gandhinagar','Gandhinagar','Gujarat',23.2156,72.6369),('Sanand','Sanand','Gujarat',22.9924,72.3814)
ON CONFLICT DO NOTHING;