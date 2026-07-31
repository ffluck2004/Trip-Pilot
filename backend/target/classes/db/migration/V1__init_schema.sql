CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    preferences_styles TEXT,
    preferences_interests TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE trips (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    destination VARCHAR(500) NOT NULL,
    duration_days INT NOT NULL,
    duration_hours INT,
    budget NUMERIC(12,2),
    people_count INT DEFAULT 1,
    travel_radius_km NUMERIC(8,2) DEFAULT 5,
    interests TEXT,
    travel_style VARCHAR(100),
    preferences_text TEXT,
    planned_budget NUMERIC(12,2),
    actual_spending NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'planning',
    current_location_idx INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE itinerary_items (
    id VARCHAR(36) PRIMARY KEY,
    trip_id VARCHAR(36) NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day INT NOT NULL,
    time_slot VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    cost_estimation NUMERIC(10,2) DEFAULT 0,
    duration_minutes INT DEFAULT 60,
    address TEXT,
    image_url TEXT,
    distance_prev_km NUMERIC(8,2) DEFAULT 0,
    travel_time_prev_min INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    upvotes INT DEFAULT 1,
    downvotes INT DEFAULT 0,
    sort_order INT DEFAULT 0
);

CREATE TABLE expenses (
    id VARCHAR(36) PRIMARY KEY,
    trip_id VARCHAR(36) NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    expense_date DATE
);

CREATE TABLE reservations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    trip_id VARCHAR(36),
    type VARCHAR(50),
    title VARCHAR(500),
    confirmation_code VARCHAR(100),
    date_time TIMESTAMP,
    details TEXT,
    cost NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE admin_places (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    address TEXT,
    rating NUMERIC(3,1) DEFAULT 4.5
);

CREATE TABLE places (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    destination VARCHAR(500),
    type VARCHAR(50),
    category VARCHAR(100),
    flight_time VARCHAR(100),
    price NUMERIC(12,2),
    rating NUMERIC(3,1),
    rating_badge VARCHAR(50),
    description TEXT,
    tags TEXT,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    hours TEXT,
    metro VARCHAR(200),
    gallery TEXT,
    amenities TEXT
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_itinerary_trip_id ON itinerary_items(trip_id);
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_reservations_user_id ON reservations(user_id);
