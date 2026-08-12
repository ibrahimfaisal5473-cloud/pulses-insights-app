-- 009_idempotent_ingestion.sql
-- Make pulse ingestion safe to retry.
--
-- THE PROBLEM THIS SOLVES
-- A camera gateway that times out waiting for a response has no way to know
-- whether the batch committed. Its only sane options are to resend or to drop
-- the readings, and resending was the dangerous one: every pulse in the batch
-- would be inserted a second time, inflating footfall and visit counts with no
-- error anywhere to show it had happened. Silent inflation is worse than a
-- loud failure, because nothing prompts anyone to look.
--
-- A detection is uniquely identified by WHO was seen, by WHICH camera, at WHAT
-- instant. Two rows sharing all three are the same observation submitted twice,
-- never two different events: one camera cannot see the same face twice at the
-- same instant. That makes it a natural key, and a UNIQUE constraint on it lets
-- the database reject the duplicate rather than trusting the caller not to send
-- one.
--
-- Paired with ON CONFLICT DO NOTHING in the ingestion path, this makes the
-- endpoint idempotent rather than merely deduplicated: resending a batch is
-- not just harmless, it is indistinguishable from never having resent it.
--
-- Verified before applying: zero existing rows violate this key.

BEGIN;

ALTER TABLE pulse
    ADD CONSTRAINT pulse_natural_key UNIQUE (face_id, camera_id, detected_at);

COMMENT ON CONSTRAINT pulse_natural_key ON pulse IS
    'Natural key of a detection. Makes retried ingestion batches idempotent.';

COMMIT;
