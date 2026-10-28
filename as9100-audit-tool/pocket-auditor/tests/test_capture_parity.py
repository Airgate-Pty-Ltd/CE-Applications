"""Parity between the capture-screen rules (prototype/capture-rules.js, run by Node) and the Python engine.

Every case runs through both. Results must match exactly, including message text. The controlled values and
required-field lists are compared too, so the two sides cannot drift apart without a failing test.
Browser-side hashing (crypto.subtle) is checked against Python's hashlib on the same bytes.
Skipped when Node is not installed. Scratch files live only in tests/_scratch in the product folder.
"""
import json
import shutil
import subprocess
import sys
import unittest
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULES = ROOT / "prototype" / "capture-rules.js"
sys.path.insert(0, str(ROOT / "engine"))
import pa_canonical as pc  # noqa: E402
import pa_governance as gv  # noqa: E402
import pa_capture as cap  # noqa: E402
import pa_vocab as vocab  # noqa: E402
import pa_engine as pe  # noqa: E402
from pa_engine import sha256_file  # noqa: E402

TODAY = date(2026, 10, 8)
TODAY_S = "2026-10-08"
HASH = "ab" * 32

GOOD_INTERVIEW = {"interviewee_role": "Technician", "interviewer": "Auditor B", "date_time": "2026-10-08T10:00",
                  "location": "Bay 2", "method": "in person", "consent_state": "NOTIFIED", "notes": "n",
                  "evidence_class": "direct_statement"}
GOOD_SAMPLE = {"population_basis": "all jobs in Q3", "selection_method": "random", "sample_identity": "J-101",
               "period": "Q3", "result": "CONFORMING", "evidence_refs": ["EV-1"], "expanded": False,
               "expansion_reason": "single conforming sample"}
GOOD_EVIDENCE = {"evidence_type": "record_review", "description": "Calibration log for gauge G-4",
                 "timestamp": "2026-10-08T09:30", "location": "Quality office", "auditor": "Auditor B",
                 "source_ref": "CAL-LOG-2026"}
GOOD_PHOTO = {"caption": "Bench 2 tooling tag", "what_it_proves": "tool is tagged", "area_or_location": "Bay 2",
              "auditor": "Auditor B", "timestamp": "2026-10-08T11:00", "requirement_id": "STD:SAE AS9110C:7.1.5.2",
              "file_name": "bench.jpg", "sha256": HASH}
GOOD_CAR = {"car_id": "CAR-1", "source_system": "QMS export", "linked_requirement": "STD:SAE AS9110C:8.5.1",
            "problem_statement": "p", "owner": "O", "due_date": "2026-12-01", "status": "open"}


def cases():
    def kase(kind, name, rec, **extra):
        return dict({"kind": kind, "name": name, "rec": rec}, **extra)
    return [
        kase("interview", "good interview", GOOD_INTERVIEW),
        kase("interview", "missing notes", dict(GOOD_INTERVIEW, notes="")),
        kase("interview", "unknown evidence class", dict(GOOD_INTERVIEW, evidence_class="rumour")),
        kase("interview", "unknown consent state", dict(GOOD_INTERVIEW, consent_state="VERBAL_OK")),
        kase("interview", "declined consent is a recognised state", dict(GOOD_INTERVIEW, consent_state="CONSENT_DECLINED")),
        kase("interview", "bad date", dict(GOOD_INTERVIEW, date_time="2026-13-01T10:00")),
        kase("interview", "impossible day", dict(GOOD_INTERVIEW, date_time="2026-02-30T10:00")),
        kase("interview", "date only is accepted", dict(GOOD_INTERVIEW, date_time="2026-10-08")),
        kase("interview", "recording without consent", dict(GOOD_INTERVIEW, recording=True)),
        kase("interview", "recording with consent", dict(GOOD_INTERVIEW, recording=True, consent_state="CONSENT_RECORDED")),
        kase("interview", "transcript unreviewed", dict(GOOD_INTERVIEW, transcript="t")),
        kase("interview", "transcript reviewed", dict(GOOD_INTERVIEW, transcript="t", transcript_reviewed_by="Auditor B")),
        kase("sampling", "good sample", GOOD_SAMPLE),
        kase("sampling", "unknown result", dict(GOOD_SAMPLE, result="MOSTLY_OK")),
        kase("sampling", "nonconforming without expansion decision", dict(GOOD_SAMPLE, result="NONCONFORMING", expanded=None)),
        kase("sampling", "nonconforming with expansion", dict(GOOD_SAMPLE, result="NONCONFORMING", expanded=True)),
        kase("sampling", "no expansion without reason", dict(GOOD_SAMPLE, expansion_reason="")),
        kase("sampling", "blank population", dict(GOOD_SAMPLE, population_basis="")),
        kase("sampling", "missing result", {k: v for k, v in GOOD_SAMPLE.items() if k != "result"}),
        kase("evidence", "good evidence", GOOD_EVIDENCE),
        kase("evidence", "photo type is not an evidence record", dict(GOOD_EVIDENCE, evidence_type="photo_file")),
        kase("evidence", "unknown evidence type", dict(GOOD_EVIDENCE, evidence_type="hearsay")),
        kase("evidence", "missing location", {k: v for k, v in GOOD_EVIDENCE.items() if k != "location"}),
        kase("evidence", "bad evidence timestamp", dict(GOOD_EVIDENCE, timestamp="09:30 today")),
        kase("evidence", "file path is refused on an evidence record", dict(GOOD_EVIDENCE, file_path="scans/gauge.jpg")),
        kase("car", "good open CAR", GOOD_CAR),
        kase("car", "missing owner", {k: v for k, v in GOOD_CAR.items() if k != "owner"}),
        kase("car", "unknown auditor result", dict(GOOD_CAR, auditor_result="great")),
        kase("car", "review precedes created", dict(GOOD_CAR, review_date="2026-09-01T10:00", created="2026-10-01T10:00")),
        kase("car", "bad review date", dict(GOOD_CAR, review_date="01/09/2026", created="2026-10-01T10:00")),
        kase("car", "review date without created is not checked", dict(GOOD_CAR, review_date="01/09/2026")),
        kase("car_flags", "closed without evidence", dict(GOOD_CAR, status="closed"), today=TODAY_S),
        kase("car_flags", "open and overdue", dict(GOOD_CAR, due_date="2026-09-01"), today=TODAY_S),
        kase("car_flags", "closed effective with evidence", dict(GOOD_CAR, status="closed", auditor_result="effective", effectiveness_evidence="EV-9"), today=TODAY_S),
        kase("car_flags", "closed ineffective", dict(GOOD_CAR, status="closed", auditor_result="ineffective", effectiveness_evidence="EV-10"), today=TODAY_S),
        kase("car_flags", "recurrence flag", dict(GOOD_CAR, recurrence=True), today=TODAY_S),
        kase("car_flags", "closed without auditor review", dict(GOOD_CAR, status="closed", effectiveness_evidence="EV-2"), today=TODAY_S),
        kase("photo", "good photo", GOOD_PHOTO),
        kase("photo", "missing caption and what_it_proves", {k: v for k, v in GOOD_PHOTO.items() if k not in ("caption", "what_it_proves")}),
        kase("photo", "missing file name and hash", {k: v for k, v in GOOD_PHOTO.items() if k not in ("file_name", "sha256")}),
        kase("photo", "hash in upper case is refused", dict(GOOD_PHOTO, sha256=HASH.upper())),
        kase("photo", "bad timestamp", dict(GOOD_PHOTO, timestamp="yesterday")),
    ]


def run_js(batch):
    code = ("const R=require(" + json.dumps(str(RULES)) + ");"
            "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{"
            "const cs=JSON.parse(s);process.stdout.write(JSON.stringify(cs.map(c=>R.runCase(c.kind,c.rec,c.today))));});")
    proc = subprocess.run(["node", "-e", code], input=json.dumps(batch), capture_output=True, text=True, encoding="utf-8")
    if proc.returncode:
        raise AssertionError(proc.stderr)
    return json.loads(proc.stdout)


def run_js_constants():
    code = ("const R=require(" + json.dumps(str(RULES)) + ");process.stdout.write(JSON.stringify(R.constants));")
    proc = subprocess.run(["node", "-e", code], capture_output=True, text=True, encoding="utf-8")
    if proc.returncode:
        raise AssertionError(proc.stderr)
    return json.loads(proc.stdout)


def run_js_digest(path):
    """SHA-256 of a file as the browser computes it (crypto.subtle), read by Node from the same bytes."""
    code = ("const b=require('fs').readFileSync(" + json.dumps(str(path)) + ");"
            "crypto.subtle.digest('SHA-256', b).then(d=>process.stdout.write(Buffer.from(d).toString('hex')));")
    proc = subprocess.run(["node", "-e", code], capture_output=True, text=True, encoding="utf-8")
    if proc.returncode:
        raise AssertionError(proc.stderr)
    return proc.stdout.strip()


def run_py(case):
    k, rec = case["kind"], case["rec"]
    if k == "interview":
        return {"errors": pc.validate_interview(rec)}
    if k == "sampling":
        return {"errors": pc.validate_sampling(rec)}
    if k == "evidence":
        return {"errors": cap.validate_evidence_record(rec)}
    if k == "photo":
        return {"errors": cap.validate_photo_record(rec)}
    if k == "car":
        return {"errors": gv.validate_car_review(rec)}
    if k == "car_flags":
        return {"flags": gv.car_flags(rec, TODAY)}
    raise AssertionError(k)


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class CaptureParityTests(unittest.TestCase):
    def setUp(self):
        self.scratch = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
        self.scratch.mkdir(parents=True)

    def tearDown(self):
        shutil.rmtree(self.scratch, ignore_errors=True)

    def test_controlled_values_and_required_lists_match_the_python_engine(self):
        js = run_js_constants()
        self.assertEqual(js["CONSENT_STATES"], list(vocab.CONSENT_STATES))
        self.assertEqual(js["SAMPLING_RESULTS"], list(vocab.SAMPLING_RESULTS))
        self.assertEqual(js["EVIDENCE_RECORD_TYPES"], list(vocab.EVIDENCE_RECORD_TYPES))
        self.assertEqual(set(js["INTERVIEW_CLASSES"]), set(vocab.INTERVIEW_CLASSES))
        self.assertEqual(js["INTERVIEW_REQUIRED"], pc.INTERVIEW_REQUIRED)
        self.assertEqual(js["SAMPLING_REQUIRED"], pc.SAMPLING_REQUIRED)
        self.assertEqual(js["EVIDENCE_REQUIRED"], pe.EVIDENCE_REQUIRED)
        self.assertEqual(js["PHOTO_REQUIRED"], cap.PHOTO_REQUIRED)
        self.assertEqual(js["PHOTO_RECORD_REQUIRED"], cap.PHOTO_RECORD_REQUIRED)
        self.assertEqual(js["CAR_REQUIRED"], gv.CAR_REQUIRED)
        self.assertEqual(set(js["CAR_REVIEW_RESULTS"]), gv.CAR_REVIEW_RESULTS)

    def test_every_case_gives_the_same_result_in_js_and_python(self):
        batch = cases()
        js_results = run_js(batch)
        self.assertEqual(len(js_results), len(batch))
        for case, js in zip(batch, js_results):
            with self.subTest(case=case["name"]):
                self.assertEqual(js, run_py(case))

    def test_browser_hash_matches_python_hash_of_the_same_bytes(self):
        f = self.scratch / "bench.jpg"
        f.write_bytes(bytes(range(256)) * 300)
        self.assertEqual(run_js_digest(f), sha256_file(f))


if __name__ == "__main__":
    unittest.main()
