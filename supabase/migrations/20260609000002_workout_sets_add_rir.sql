-- Store the prescribed RIR alongside each logged set so the progression
-- engine can retrieve effort context per session without a separate join.
alter table workout_sets add column if not exists rir int;
