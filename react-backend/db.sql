CREATE TABLE rooms (
	ID varchar(8) PRIMARY KEY,
	curr_capacity integer CHECK (curr_capacity > 0 AND curr_capacity < 5),
	max_capacity integer CHECK (max_capacity > 0 AND max_capacity < 5),
	closed boolean,
	difficulty difficulty_setting,
	description text,
	created timestamp DEFAULT now()
);

CREATE TABLE characters (
	name text PRIMARY KEY,
	race text,
	weapon text,
	story_exclusive boolean
);

INSERT INTO rooms VALUES(
	'BADBEEF',
	4,
	4,
	FALSE,
	'EASY',
	''
);