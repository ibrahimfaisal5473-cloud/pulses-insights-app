#!/usr/bin/env python3
"""
Generate realistic pulse data for the Pulses Insights database.

Random rows would satisfy the schema and teach you nothing, because none of the
derived metrics would mean anything. This models the behaviour instead:

  * PEOPLE move along plausible paths. An employee goes entrance -> reception ->
    workspace -> cafe -> workspace -> entrance. A guest waits then takes a
    meeting. Nobody teleports from the cafe to the help desk.

  * DWELL produces repeat detections. A camera sees a face repeatedly while the
    person is in view, so one stop in a zone becomes many rows. This is what
    makes "visits vs. detections" a real distinction rather than a trivia
    question.

  * THE SAME PERSON RETURNS. Employees keep one face_id across the whole period
    and come in most weekdays, so unique-visitor counts are genuinely lower than
    visit counts, which are genuinely lower than detection counts.

  * THE VISION MODEL IS IMPERFECT. Age is re-estimated every detection with
    noise, gender is occasionally misread, and some faces are unreadable
    (NULL). This is why demographics must be resolved per face_id before being
    aggregated -- the data proves the point.

  * TIME HAS SHAPE. Weekday mornings peak, lunch fills the cafe, weekends are
    skeleton staff. Flat data would make every time-series chart a straight line.

Usage:
    python3 generate_pulses.py cameras.csv pulses.csv [days]
"""

import csv
import random
import sys
from datetime import datetime, timedelta, timezone

SEED = 20260807
DAYS = 30
TZ = timezone(timedelta(hours=4))          # Asia/Dubai, no DST

random.seed(SEED)

# --- how often a camera registers a face, per minute of dwell ----------------
# Busy thoroughfares catch a face constantly; someone at a desk is facing away
# most of the time. This ratio is what stops the workspace swamping the dataset.
#
# Rates are per MINUTE of dwell. The trailing comment on each line is the same
# figure as an AVERAGE cadence, which is the way to sanity-check it: a real
# detection pipeline emits a recognised face every few seconds while someone is
# squarely in view, and only intermittently once they turn away from the lens.
#
# Detections are scattered at uniform random offsets across the dwell rather
# than spaced evenly, so the observed MEDIAN gap runs roughly a third shorter
# than the average quoted here — bursts of two or three close together, then a
# longer quiet stretch. That is the intended shape; real cameras are not
# metronomes.
#
# The previous values were an order of magnitude too sparse to be plausible.
# At 2.0/min the Entrance — where a pass lasts 0.5-1.5 minutes — produced about
# TWO detections for a whole walk-through, implying a camera that noticed a
# person twice and then lost interest. Every rate below is the old one scaled
# by 10, so the relative weighting between zones is unchanged and the workspace
# still cannot swamp the dataset; only the absolute cadence has moved into a
# range a real camera would produce.
DETECTION_RATE = {
    "ENTRANCE":  20.0,   # every 3s   - walking straight past the lens
    "RECEPTION": 14.0,   # every 4s   - standing at a desk, facing forward
    "WAITING":    7.0,   # every 9s   - seated, looking around
    "MEETING":    2.5,   # every 24s  - seated, often turned to other people
    "WORKSPACE":  1.2,   # every 50s  - at a desk, mostly facing a screen
    "CAFE":       5.0,   # every 12s  - moving around, frequently in view
    "HELPDESK":   9.0,   # every 7s   - facing an agent across a counter
}

# --- emotional tone of each area --------------------------------------------
# Three classes only: happy / neutral / sad.
#
# CALIBRATION
# The happiness index scores happy=100, neutral=50, sad=0 and averages over
# detections, so a zone's index follows directly from its mix:
#
#     index = 100*happy + 50*neutral
#
# Tuned so a healthy office reads about 75 overall. Commercial sentiment models
# are calibrated to read a relaxed, unremarkable face as mildly positive rather
# than neutral, so ordinary working areas sit comfortably above the midpoint and
# only genuine friction pulls a zone down.
#
# The SPREAD matters as much as the average. Waiting areas and the help desk are
# held well below the rest, because two things depend on it:
#
#   1. The index has to distinguish "fine" from "bad". A mix where every zone
#      lands within a few points makes the metric unactionable.
#   2. The dissatisfied-visitor page flags visits scoring under 60. A visit is
#      the weighted average of its stops, so only journeys that spend real time
#      in the low zones fall through -- which is exactly who should be flagged.
#      If every zone sat at 80, that page would silently empty out.
EMOTION_MIX = {
    "ENTRANCE":  {"happy": .59, "neutral": .36, "sad": .05},  # ~77
    "RECEPTION": {"happy": .61, "neutral": .34, "sad": .05},  # ~78
    "WAITING":   {"happy": .28, "neutral": .54, "sad": .18},  # ~55
    "MEETING":   {"happy": .58, "neutral": .36, "sad": .06},  # ~76
    "WORKSPACE": {"happy": .55, "neutral": .40, "sad": .05},  # ~75
    "CAFE":      {"happy": .71, "neutral": .26, "sad": .03},  # ~84
    "HELPDESK":  {"happy": .22, "neutral": .56, "sad": .22},  # ~50
}

# Mood shifts the same person's readings across a whole visit, so emotions
# cluster per person instead of being independent coin flips.
#
# Kept gentle on purpose. With a happy-leaning baseline the shift is asymmetric:
# multiplying an already-large happy weight barely moves it after
# normalisation, while the matching penalty on a bad day removes a lot. A wide
# spread would therefore drag the mean well below the calibrated target. These
# values preserve per-person clustering without swamping the zone mixes above.
MOOD_SHIFT = {"good": 1.35, "normal": 1.0, "bad": 0.65}


def weighted_choice(weights):
    total = sum(weights.values())
    r = random.random() * total
    upto = 0.0
    for key, w in weights.items():
        upto += w
        if r <= upto:
            return key
    return next(iter(weights))


def pick_emotion(zone_code, mood):
    mix = dict(EMOTION_MIX[zone_code])
    mix["happy"] *= MOOD_SHIFT[mood]
    mix["sad"] *= 1.0 / MOOD_SHIFT[mood]
    return weighted_choice(mix)


class Person:
    """A real human with stable attributes the cameras only ever estimate."""

    def __init__(self, face_id, kind):
        self.face_id = face_id
        self.kind = kind
        # Floor at 22, not 19. The camera re-estimates age with noise, so a
        # true age of 19 resolves to a median in the teens often enough to put
        # "10s" on an office dashboard — which reads as a broken age model
        # rather than a young workforce. A floor of 22 leaves room for the
        # noise to wander without crossing the decade boundary.
        self.true_age = max(22, min(64, int(random.gauss(35, 10))))
        self.true_gender = random.choices(
            ["male", "female"], weights=[0.54, 0.46])[0]

    def observe(self):
        """One camera's noisy reading of this person, right now."""
        # 3% of detections catch a face too poorly to read anything from.
        if random.random() < 0.03:
            return None, None

        # Age is re-guessed every frame. Same person, different answer -- which
        # is exactly why demographics get resolved per face before aggregation.
        age = int(round(random.gauss(self.true_age, 2.6)))
        age = max(0, min(120, age))

        r = random.random()
        if r < 0.04:
            gender = "unknown"
        elif r < 0.07:
            gender = "female" if self.true_gender == "male" else "male"
        else:
            gender = self.true_gender
        return age, gender


def journey_for(kind, zones):
    """A plausible path through the building as (zone_code, dwell_minutes)."""
    has = lambda z: z in zones

    if kind == "employee":
        stops = [("ENTRANCE", random.uniform(0.5, 1.5))]
        if has("RECEPTION") and random.random() < 0.65:
            stops.append(("RECEPTION", random.uniform(0.5, 2.0)))
        morning = random.uniform(150, 240)
        stops.append(("WORKSPACE", morning))
        if has("CAFE"):
            stops.append(("CAFE", random.uniform(25, 50)))
        stops.append(("WORKSPACE", random.uniform(150, 240)))
        stops.append(("ENTRANCE", random.uniform(0.5, 1.5)))
        return stops

    if kind == "guest":
        stops = [("ENTRANCE", random.uniform(0.5, 2.0))]
        if has("RECEPTION"):
            stops.append(("RECEPTION", random.uniform(1.5, 5.0)))
        if has("WAITING"):
            stops.append(("WAITING", random.uniform(5, 28)))
        if has("MEETING"):
            stops.append(("MEETING", random.uniform(30, 95)))
        elif has("WORKSPACE"):
            stops.append(("WORKSPACE", random.uniform(30, 80)))
        if has("CAFE") and random.random() < 0.35:
            stops.append(("CAFE", random.uniform(12, 30)))
        stops.append(("ENTRANCE", random.uniform(0.5, 1.5)))
        return stops

    if kind == "support":
        stops = [("ENTRANCE", random.uniform(0.5, 1.5))]
        if has("RECEPTION"):
            stops.append(("RECEPTION", random.uniform(1.0, 3.0)))
        stops.append(("HELPDESK", random.uniform(4, 14)))
        if has("WAITING") and random.random() < 0.6:
            stops.append(("WAITING", random.uniform(6, 25)))
            stops.append(("HELPDESK", random.uniform(4, 12)))
        stops.append(("ENTRANCE", random.uniform(0.5, 1.5)))
        return stops

    # quick errand
    stops = [("ENTRANCE", random.uniform(0.4, 1.2))]
    if has("RECEPTION"):
        stops.append(("RECEPTION", random.uniform(1.0, 4.0)))
    stops.append(("ENTRANCE", random.uniform(0.4, 1.2)))
    return stops


def arrival_time(day, kind):
    """Arrivals cluster; they are not spread evenly across the day."""
    if kind == "employee":
        minute = random.gauss(8 * 60 + 45, 42)      # ~08:45 peak
        minute = max(6 * 60 + 45, min(11 * 60, minute))
    elif kind == "support":
        minute = random.gauss(11 * 60, 130)
        minute = max(8 * 60, min(17 * 60, minute))
    else:
        minute = random.gauss(13 * 60, 150)         # guests spread over the day
        minute = max(8 * 60 + 30, min(17 * 60 + 30, minute))
    return day + timedelta(minutes=minute)


def main():
    cameras_path, out_path = sys.argv[1], sys.argv[2]
    days = int(sys.argv[3]) if len(sys.argv) > 3 else DAYS

    # camera_id -> which site and zone it watches
    cams_by_site_zone = {}
    zones_by_site = {}
    with open(cameras_path) as fh:
        for row in csv.DictReader(fh):
            key = (row["site"], row["zone"])
            cams_by_site_zone.setdefault(key, []).append(int(row["camera_id"]))
            zones_by_site.setdefault(row["site"], set()).add(row["zone"])

    # Staff keep the same face_id for the whole period. This is what makes
    # unique visitors < visits < detections, and it is what the "repeat
    # visitors" metric should rediscover on its own.
    #
    # Built from whatever sites the reference data actually contains, so adding
    # or removing an office is a change to the SQL seed only.
    STAFF_HEADCOUNT = {"DXB-HQ": 140}
    DEFAULT_HEADCOUNT = 60
    staff = {
        site: [
            Person(f"FACE-{site}-{i:05d}", "employee")
            for i in range(1, STAFF_HEADCOUNT.get(site, DEFAULT_HEADCOUNT) + 1)
        ]
        for site in zones_by_site
    }
    visitor_counter = 0

    now = datetime.now(TZ)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_day = today - timedelta(days=days - 1)

    rows = 0
    with open(out_path, "w", newline="") as out:
        w = csv.writer(out)
        w.writerow(["camera_id", "face_id", "detected_at", "age", "gender", "emotion"])

        for d in range(days):
            day = start_day + timedelta(days=d)
            weekend = day.weekday() >= 5          # Sat/Sun

            for site, zones in zones_by_site.items():
                people_today = []

                # Employees: most come in on weekdays, a handful at weekends.
                attend = 0.10 if weekend else 0.82
                for person in staff[site]:
                    if random.random() < attend:
                        people_today.append(person)

                # One-off visitors get a fresh face_id -- they are not repeats.
                guest_count = int(random.gauss(4 if weekend else 22, 4))
                support_count = int(random.gauss(1 if weekend else 8, 2))
                quick_count = int(random.gauss(1 if weekend else 6, 2))

                for kind, count in (("guest", guest_count),
                                    ("support", support_count),
                                    ("quick", quick_count)):
                    if kind == "support" and "HELPDESK" not in zones:
                        continue
                    for _ in range(max(0, count)):
                        visitor_counter += 1
                        people_today.append(
                            Person(f"FACE-V-{visitor_counter:06d}", kind))

                for person in people_today:
                    t = arrival_time(day, person.kind)
                    if t > now:
                        continue
                    mood = random.choices(
                        ["good", "normal", "bad"], weights=[.25, .56, .19])[0]

                    for zone_code, dwell in journey_for(person.kind, zones):
                        cams = cams_by_site_zone.get((site, zone_code))
                        if not cams:
                            t += timedelta(minutes=dwell)
                            continue

                        rate = DETECTION_RATE[zone_code]
                        n = max(1, int(round(dwell * rate * random.uniform(0.75, 1.25))))

                        # A person tends to stay in one camera's field of view,
                        # with the occasional hand-off to a neighbour.
                        primary = random.choice(cams)
                        for _ in range(n):
                            offset = random.uniform(0, dwell)
                            ts = t + timedelta(minutes=offset)
                            if ts > now:
                                continue
                            cam = primary if random.random() < 0.82 else random.choice(cams)
                            age, gender = person.observe()
                            emotion = (pick_emotion(zone_code, mood)
                                       if age is not None or random.random() < 0.7
                                       else None)
                            w.writerow([
                                cam,
                                person.face_id,
                                ts.isoformat(),
                                "" if age is None else age,
                                "" if gender is None else gender,
                                "" if emotion is None else emotion,
                            ])
                            rows += 1

                        t += timedelta(minutes=dwell)

    print(f"wrote {rows:,} pulses covering {days} days to {out_path}")


if __name__ == "__main__":
    main()
