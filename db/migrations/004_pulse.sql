-- 004_pulse.sql
-- Location -> Zone -> Camera -> Pulse
--                               ^^^^^
-- The raw data. One row = ONE DETECTION of one person by one camera.
--
-- This is the only table the outside world writes to, and the only one that
-- grows without limit. Every metric in the project -- visits, visitors,
-- journeys, demographics, happiness -- is computed from these rows.

CREATE TABLE pulse (
    -- bigint, not integer. An integer key stops at ~2.1 billion, which at even
    -- modest detection rates is months, not years. Fixing that after the fact
    -- means rewriting the whole table, so it costs nothing to get right now.
    pulse_id     bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Which camera saw this. The link back into the hierarchy: zone and
    -- location are recovered by joining, never stored again here.
    camera_id    integer     NOT NULL
                             REFERENCES camera (camera_id)
                             ON DELETE RESTRICT,

    -- The identifier the vision system assigns to a recognised face.
    -- NOT a foreign key: it comes from outside and refers to no table we own.
    -- This single column is what makes "unique visitors" answerable at all --
    -- without it, every detection would be an anonymous, unconnectable dot.
    face_id      text        NOT NULL,

    -- When the detection happened. Distinct from created_at below: this is
    -- when the camera SAW the person, not when we stored the row.
    detected_at  timestamptz NOT NULL,

    -- The vision model's per-frame estimates. All nullable, because a face may
    -- be detected clearly enough to count as footfall but not clearly enough
    -- to estimate age or read an expression.
    --
    -- Worth knowing: these are re-estimated on EVERY detection, so the same
    -- person can be guessed at 28, then 31, then 26. Resolving that noise into
    -- one demographic per visitor is a backend job, not a database concern.
    age          smallint,
    gender       text,
    emotion      text,

    created_at   timestamptz NOT NULL DEFAULT now(),

    -- CHECK constraints restrict a column to a fixed set of values. Used here
    -- instead of a Postgres ENUM type because they are easy to read in
    -- pgAdmin, easy to change later, and need no special type management.
    CONSTRAINT pulse_age_valid
        CHECK (age IS NULL OR (age >= 0 AND age <= 120)),

    CONSTRAINT pulse_gender_valid
        CHECK (gender IS NULL OR gender IN ('male', 'female', 'unknown')),

    -- Three-class sentiment: positive, neutral, negative.
    -- Deliberately not the seven-class academic set (angry/surprise/fear/
    -- disgust). Those extra labels are unreliable in practice and none of the
    -- required metrics distinguish them -- the happiness index only needs to
    -- know which direction a face leans.
    CONSTRAINT pulse_emotion_valid
        CHECK (emotion IS NULL OR emotion IN ('happy', 'neutral', 'sad'))
);

CREATE INDEX pulse_camera_id_idx   ON pulse (camera_id);
CREATE INDEX pulse_detected_at_idx ON pulse (detected_at);
CREATE INDEX pulse_face_id_idx     ON pulse (face_id);

COMMENT ON TABLE  pulse             IS 'Raw detections. One row per person seen by a camera.';
COMMENT ON COLUMN pulse.face_id     IS 'Vision-system face identifier. Basis for unique-visitor counts.';
COMMENT ON COLUMN pulse.detected_at IS 'When the camera saw the face (not when the row was stored).';
COMMENT ON COLUMN pulse.emotion     IS 'Per-detection expression estimate. Basis for the happiness index.';
