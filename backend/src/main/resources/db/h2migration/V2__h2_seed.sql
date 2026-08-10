INSERT INTO users (id, email, password, name, "role", preferences_styles, preferences_interests, created_at) VALUES
('admin-id', 'admin@trippilot.com', '$2a$10$bcxtrh5jrfk//Cc4I1XK5uJYTQIDsNUPEfYvoiUvNfBZB7md17fFm', 'Admin Pilot', 'ADMIN', 'Luxury,Adventure,Food Explorer', 'Photography,Sightseeing,Food', NOW()),
('guest-id', 'guest@trippilot.com', '$2a$10$k7CmKbgYC/AuddGi3q0.E.tMc8i.J1e2j/bf6lm5XdXiSaQA6te/C', 'Amelia Earhart', 'USER', 'Adventure,Photography,Cultural Explorer', 'Heritage,Nature,Local Food,Photography', NOW());

INSERT INTO places (id, title, destination, type, category, price, rating, description, tags, lat, lng) VALUES
('p1', 'Paris', 'Paris, France', 'DESTINATION', 'CULTURAL', 850, 4.8, 'The City of Light awaits with world-class art, cuisine, and romance.', 'Romance,Art,Food', 48.8566, 2.3522),
('p2', 'Jaipur', 'Jaipur, India', 'DESTINATION', 'HERITAGE', 320, 4.7, 'The Pink City of Rajasthan with magnificent forts and palaces.', 'Heritage,Forts,Shopping', 26.9124, 75.7873),
('p3', 'Goa', 'Goa, India', 'DESTINATION', 'BEACH', 280, 4.6, 'Sun-kissed beaches, vibrant nightlife, and Portuguese heritage.', 'Beaches,Nightlife,History', 15.2993, 74.1240),
('p4', 'Mumbai', 'Mumbai, India', 'DESTINATION', 'URBAN', 190, 4.5, 'The city of dreams with Bollywood glamour and street food paradise.', 'Bollywood,Food,Architecture', 18.9220, 72.8347),
('p5', 'London', 'London, UK', 'DESTINATION', 'CULTURAL', 920, 4.7, 'Royal heritage meets modern cosmopolitan culture.', 'History,Theatre,Museums', 51.5074, -0.1278),
('p6', 'Taj Mahal Palace', 'Mumbai, India', 'HOTEL', 'LUXURY', 18000, 4.9, 'Iconic luxury hotel overlooking the Arabian Sea.', 'Luxury,Heritage,Sea View', 18.9220, 72.8347),
('p7', 'The Leela Palace', 'Jaipur, India', 'HOTEL', 'LUXURY', 22000, 4.8, 'Royal Rajasthani hospitality with modern amenities.', 'Luxury,Pool,Spa', 26.9124, 75.7873);
