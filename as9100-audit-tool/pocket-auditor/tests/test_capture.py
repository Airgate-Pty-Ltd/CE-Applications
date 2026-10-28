"""Tests for engine/pa_capture.py: CAR review, interview, sampling and photo capture records."""
import shutil
import sys
import unittest
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_capture as cap  # noqa: E402


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


class InterviewCaptureTests(unittest.TestCase):
    def test_valid_interview_is_captured(self):
        rec = cap.capture_interview({"interviewee_role": "Technician", "interviewer": "Auditor B",
                                     "date_time": "2026-10-08T10:00:00", "location": "Bay 2", "method": "in person",
                                     "consent_state": "NOTIFIED", "notes": "n", "evidence_class": "direct_statement"})
        self.assertEqual(rec["record_type"], "interview")

    def test_incomplete_interview_raises_with_reasons(self):
        with self.assertRaises(ValueError) as ctx:
            cap.capture_interview({"interviewee_role": "Technician"})
        self.assertIn("missing field: notes", str(ctx.exception))


class SamplingCaptureTests(unittest.TestCase):
    def test_nonconforming_without_expansion_decision_raises(self):
        with self.assertRaises(ValueError):
            cap.capture_sampling({"population_basis": "Q3", "selection_method": "random", "sample_identity": "J-1",
                                  "period": "Q3", "result": "NONCONFORMING", "evidence_refs": ["EV-1"], "expanded": None})


class PhotoCaptureTests(unittest.TestCase):
    def test_photo_is_recorded_by_hash_and_not_copied(self):
        d = scratch()
        try:
            img = d / "bench.jpg"
            img.write_bytes(b"synthetic image bytes")
            rec = cap.capture_photo(img, {"caption": "Bench 2 tooling tag", "what_it_proves": "tool is tagged",
                                          "area_or_location": "Bay 2", "auditor": "Auditor B",
                                          "timestamp": "2026-10-08T11:00:00", "requirement_id": "STD:SAE AS9110C:7.1.5.2"})
            self.assertEqual(len(rec["sha256"]), 64)
            self.assertEqual(rec["file_name"], "bench.jpg")
            self.assertEqual(sorted(p.name for p in d.iterdir()), ["bench.jpg"])
        finally:
            shutil.rmtree(d)

    def test_photo_without_description_is_rejected(self):
        d = scratch()
        try:
            img = d / "x.jpg"
            img.write_bytes(b"x")
            with self.assertRaises(ValueError) as ctx:
                cap.capture_photo(img, {"area_or_location": "Bay", "auditor": "A", "timestamp": "2026-10-08T11:00:00",
                                        "requirement_id": "STD:SAE AS9110C:8.1"})
            self.assertIn("missing field: caption", str(ctx.exception))
            self.assertIn("missing field: what_it_proves", str(ctx.exception))
        finally:
            shutil.rmtree(d)

    def test_missing_photo_file_is_rejected(self):
        with self.assertRaises(ValueError):
            cap.capture_photo(ROOT / "does-not-exist.jpg", {})


class CarCaptureTests(unittest.TestCase):
    car = {"car_id": "CAR-1", "source_system": "QMS export", "linked_requirement": "STD:SAE AS9110C:8.1.1",
           "problem_statement": "p", "owner": "O", "due_date": "2026-09-01", "status": "closed"}

    def test_closed_car_without_effectiveness_evidence_is_flagged_not_assumed_effective(self):
        rec = cap.capture_car_review(self.car, date(2026, 10, 8))
        self.assertTrue(any("CLOSED WITHOUT EFFECTIVENESS" in f for f in rec["flags"]))

    def test_incomplete_car_is_rejected(self):
        with self.assertRaises(ValueError):
            cap.capture_car_review({"car_id": "CAR-2"}, date(2026, 10, 8))


if __name__ == "__main__":
    unittest.main()
