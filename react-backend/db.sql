CREATE TABLE rooms (
	ID varchar(8) PRIMARY KEY,
	curr_capacity integer CHECK (curr_capacity > 0 AND curr_capacity < 5),
	max_capacity integer CHECK (max_capacity > 0 AND max_capacity < 5),
	closed boolean,
	difficulty difficulty_setting,
	description text,
	created timestamp DEFAULT now()
);

CREATE Table Questions (
	id SERIAL PRIMARY KEY,
	roomId varchar(8) REFERENCES rooms(id),
	username varchar(20),
	character_id bigint REFERENCES characters(character_id),
	round int,
	description text
);

CREATE Table Characters(
	character_id bigint PRIMARY KEY,
	name varchar(50),
	race varchar(10),
	weapon varchar(20),
	story_exclusive boolean,
	restricted_words text
);

INSERT INTO characters VALUES(
	1,
	'Lecia',
	'Human',
	'Sword',
	false,
	'test'
);

INSERT INTO Questions(roomid, username, character_id) VALUES(
	'HOWDY',
	'Jack',
	1
) RETURNING id;

SELECT name from characters where character_id=(
	SELECT character_id from questions where id=3
);

