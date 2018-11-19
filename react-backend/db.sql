CREATE TABLE rooms (
	ID varchar(8) PRIMARY KEY,
	curr_capacity integer CHECK (curr_capacity > 0 AND curr_capacity < max_capacity),
	max_capacity integer CHECK (max_capacity > 0 AND max_capacity < 5),
  started boolean,
	closed boolean,
	description text,
	created timestamp DEFAULT now(),
  owner text,
  max_rounds integer
);

CREATE Table Characters(
  character_id SERIAL PRIMARY KEY,
  name varchar(50),
  element varchar(10),
  race varchar(10),
  weapon varchar(20),
  style varchar(10),
  story_exclusive boolean,
  restricted_words text
);

CREATE Table Questions (
	id SERIAL PRIMARY KEY,
	roomId varchar(8) REFERENCES rooms(id) ON DELETE CASCADE,
	username varchar(20),
	character_id bigint REFERENCES characters(character_id),
	round int,
	description text
);



