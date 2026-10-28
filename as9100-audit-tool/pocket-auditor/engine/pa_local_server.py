"""Local recorder for the capture and selection screens.

Serves the prototype on 127.0.0.1, takes capture records into the audit ledger, and serves the FAA QSA
selection workflow. The browser cannot write files, so each screen posts here; the engine validates and writes.

Endpoints:
  GET  /api/audits/<id>/records                 verified ledger records
  POST /api/audits/<id>/records                 append a capture record {record_type, record}
  GET  /api/qsa/criteria?audit=<id>             the 122 source rows, additions, draft selection, latest publication
  POST /api/audits/<id>/qsa/selection           {action: select|clear|select_all|clear_all, ids?, element?}
  POST /api/audits/<id>/qsa/additions           {label, question, source_citation}
  POST /api/audits/<id>/qsa/publish             publish the selection (refused when nothing is selected)
  GET  /api/audits/<id>/qsa/start               criteria for Start Audit (the published selection)

Security posture (single user, local):
- binds to 127.0.0.1 only
- a request with an Origin header must come from this server (localhost or 127.0.0.1 on the same port)
- static files are limited to prototype/, content/checklists/ and content/rows-*.json. licensed-private/,
  engine/, tests/ and audits/ are never served. Paths are normalised before the check, so ../ cannot escape.
- POST bodies are limited to 64 KB and must be JSON
- no request log is written to disk
- the QSA source is Burrana-private; the recorder shows its questions to the local user only and never exports them

Run from the product folder:  python -I engine/pa_local_server.py [port]   (default 5173)
Standalone; writes only under the audits root.
"""
import json
import posixpath
import sys
import threading
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, unquote, parse_qs

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_ledger as lg  # noqa: E402
import pa_qsa as qsa  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_selection as sel  # noqa: E402
import pa_setup as su  # noqa: E402
import pa_review as rv  # noqa: E402
import pa_progress as prg  # noqa: E402
import pa_planning as pl  # noqa: E402
import pa_audit_record as arec  # noqa: E402
import pa_report as prep  # noqa: E402
from datetime import date as _date  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MAX_BODY = 64 * 1024
STATIC_PREFIXES = ("prototype/", "content/checklists/", "content/rows-")
QSA_ACTIONS = {"selection": "selection", "additions": "additions", "publish": "publish", "start": "start"}
# The QSA draft is a read-modify-write file. Rapid user clicks can overlap two requests;
# without a lock the second write is computed from the pre-first-write state and loses a selection.
_DRAFT_LOCK = threading.Lock()


class BadRequest(ValueError):
    """The request body is not usable JSON. Answered with 400, not 422."""


def _is_static_allowed(clean):
    if clean.endswith("/") or clean == "":
        return False
    return clean.startswith(STATIC_PREFIXES)


def _criteria_view(checklist, draft, published):
    """What the selection screen shows. Condition text is left out; it is not needed to select."""
    cat = qsa.catalogue(checklist, draft)
    rows = [{k: c.get(k) for k in ("criterion_id", "source_sheet", "criteria_ref", "question", "status",
                                   "applicability", "assessment", "origin", "source_citation")}
            for c in cat]
    return {
        "source": {"file_sha256": checklist["file_sha256"], "status": checklist["data"]["status"],
                   "licence_scope": checklist["data"]["licence_scope"], "criteria_count": len(checklist["criteria"])},
        "elements": qsa.elements(checklist["criteria"]),
        "criteria": rows,
        "selected": draft["selected"],
        "published": published,
    }


def _latest_publication(audits_root, audit_id):
    entries = lg.read_entries(lg.ledger_path(audits_root, audit_id))
    pubs = [e for e in entries if e["record_type"] == "qsa_publication"]
    if not pubs:
        return None
    last = pubs[-1]["record"]
    return {"version": last["version"], "selected_count": last["selected_count"], "sha256": last["sha256"]}


def make_handler(product_root, audits_root, allowed_origins):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(product_root), **kwargs)

        def log_message(self, *args):  # no request log on disk
            pass

        def _json(self, code, obj):
            body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _route(self):
            """Return (name, audit_id) for an API path, or None for static files."""
            parsed = urlparse(self.path)
            parts = parsed.path.strip("/").split("/")
            if parts == ["api", "selection", "criteria"]:
                return ("sel_criteria", parse_qs(parsed.query).get("audit", [""])[0])
            if len(parts) == 5 and parts[:2] == ["api", "audits"] and parts[3] == "selection" and parts[4] in ("action", "publish", "start"):
                return ("sel_" + parts[4], parts[2])
            if parts == ["api", "qsa", "criteria"]:
                return ("qsa_criteria", parse_qs(parsed.query).get("audit", [""])[0])
            if len(parts) == 4 and parts[:2] == ["api", "audits"] and parts[3] == "records":
                return ("records", parts[2])
            if len(parts) == 4 and parts[:2] == ["api", "audits"] and parts[3] == "progress":
                return ("step_progress", parts[2])
            if len(parts) == 4 and parts[:2] == ["api", "audits"] and parts[3] == "planning":
                return ("plan_get", parts[2])
            if len(parts) == 4 and parts[:2] == ["api", "audits"] and parts[3] == "report":
                return ("step_report", parts[2])
            if len(parts) == 5 and parts[:2] == ["api", "audits"] and parts[3] == "planning" and parts[4] in ("manual", "exclusions", "complete"):
                return ("plan_" + parts[4], parts[2])
            if len(parts) == 6 and parts[:2] == ["api", "audits"] and parts[3:] == ["planning", "exclusions", "review"]:
                return ("plan_review", parts[2])
            if len(parts) == 4 and parts[:2] == ["api", "audits"] and parts[3] in ("setup", "status", "snapshot", "export", "review"):
                return ("step_" + parts[3], parts[2])
            if len(parts) == 5 and parts[:2] == ["api", "audits"] and parts[3] == "qsa" and parts[4] in QSA_ACTIONS:
                return ("qsa_" + QSA_ACTIONS[parts[4]], parts[2])
            if len(parts) == 5 and parts[:2] == ["api", "audits"] and parts[3:] == ["qsa", "status"]:
                return ("qsa_status", parts[2])
            if len(parts) == 5 and parts[:2] == ["api", "audits"] and parts[3:] == ["qsa", "assessments"]:
                return ("qsa_assessments", parts[2])
            if len(parts) == 5 and parts[:2] == ["api", "audits"] and parts[3:] == ["qsa", "findings"]:
                return ("qsa_findings", parts[2])
            if len(parts) == 6 and parts[:2] == ["api", "audits"] and parts[3:] == ["qsa", "findings", "classify"]:
                return ("qsa_classify", parts[2])
            if parts[:1] == ["api"]:
                return ("unknown_api", None)
            return None

        def _origin_ok(self):
            origin = self.headers.get("Origin")
            return origin is None or origin in allowed_origins

        def _body(self):
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY:
                raise OverflowError("request body too large")
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except ValueError as exc:
                raise BadRequest("body is not valid JSON") from exc
            if not isinstance(body, dict):
                raise BadRequest("body must be a JSON object")
            return body

        def _fail(self, exc, default=422):
            msg = str(exc)
            if isinstance(exc, OverflowError):
                return self._json(413, {"errors": [msg]})
            if isinstance(exc, BadRequest):
                return self._json(400, {"errors": [msg]})
            code = 409 if msg.startswith("ledger does not verify") else default
            return self._json(code, {"errors": msg.split("; ")})

        def do_GET(self):
            route = self._route()
            if route is not None:
                name, audit_id = route
                try:
                    if name == "records":
                        entries = lg.read_entries(lg.ledger_path(audits_root, audit_id))
                        errors, head = lg.verify(entries)
                        return self._json(200, {"audit_id": audit_id, "ledger_head": head, "verified": not errors,
                                                "errors": errors, "records": entries})
                    if name == "qsa_criteria":
                        checklist = qsa.load_checklist()
                        draft = qsa.read_draft(audits_root, audit_id) if audit_id else {"selected": [], "additions": []}
                        pub = _latest_publication(audits_root, audit_id) if audit_id else None
                        return self._json(200, _criteria_view(checklist, draft, pub))
                    if name == "qsa_start":
                        result = qsa.start_audit(audits_root, audit_id, qsa.load_checklist())
                        return self._json(200, result)
                    if name == "step_setup":
                        return self._json(200, {"setup": su.current_setup(audits_root, audit_id),
                                                "status": su.current_status(audits_root, audit_id)})
                    if name == "step_progress":
                        return self._json(200, prg.progress(audits_root, audit_id))
                    if name == "plan_get":
                        return self._json(200, pl.planning_state(audits_root, audit_id))
                    if name == "step_report":
                        latest = rv.latest_snapshot(audits_root, audit_id)
                        if latest is None:
                            return self._json(422, {"errors": ["no snapshot yet: take a snapshot first"]})
                        snap, path = latest
                        # ledger assessments for this snapshot's standard (conduct records), in report form
                        label_prefix = "STD:" + arec.standard_label(snap["standard"]) + ":"
                        rows = {r["ref"] for r in snap["rows"]}
                        status = qr.status(audits_root, audit_id, qsa.load_checklist())
                        latest_ev = {}
                        for e in lg.read_entries(lg.ledger_path(audits_root, audit_id)):
                            if e["record_type"] == "qsa_assessment":
                                latest_ev[e["record"]["criterion_id"]] = e["record"]
                        assessed = []
                        for c in status["criteria"]:
                            cid = c["criterion_id"]
                            if c["assessment"] in ("CONFORMING", "NONCONFORMING") and cid.startswith(label_prefix) and c["criteria_ref"] in rows:
                                assessed.append({"ref": c["criteria_ref"], "result": c["assessment"],
                                                 "evidence_ids": list(latest_ev.get(cid, {}).get("evidence_ids", []))})
                        try:
                            rep = prep.build_report(snap, arec.sha256_file(path), [], prep.evidence_register(snap), assessed,
                                                    "Burrana Inc.", datetime.now().isoformat(timespec="seconds"))
                        except ValueError as exc:
                            return self._json(422, {"errors": str(exc).split("; ")})
                        rep["qsa_findings"] = status["counts"]["findings"]
                        rep["qsa_findings_unclassified"] = status["counts"]["findings_unclassified"]
                        return self._json(200, rep)
                    if name == "step_review":
                        exported = []
                        exp = audits_root / audit_id / "exports"
                        if exp.exists():
                            exported = sorted(p.name for p in exp.iterdir() if p.is_dir())
                        latest = rv.latest_snapshot(audits_root, audit_id)
                        try:
                            qsa_status = qr.status(audits_root, audit_id, qsa.load_checklist())
                        except ValueError:
                            qsa_status = None
                        cars = []
                        for e in lg.read_entries(lg.ledger_path(audits_root, audit_id)):
                            if e["record_type"] == "car":
                                car = e["record"]
                                cars.append({"id": e["id"], "car_id": car.get("car_id"), "status": car.get("status"),
                                             "linked_requirement": car.get("linked_requirement"),
                                             "state": arec.car_state(car),
                                             "flags": arec.car_flags(car, _date.today())})
                        return self._json(200, {"status": su.current_status(audits_root, audit_id), "cars": cars,
                                                "snapshot_standards": rv.scoped_standards(audits_root, audit_id),
                                                "snapshot": None if latest is None else {
                                                    "version": latest[0].get("snapshot_version"),
                                                    "ready_for_export": latest[0].get("ready_for_export"),
                                                    "blocking_issues": latest[0].get("blocking_issues", []),
                                                    "file": latest[1].name},
                                                "exports": exported,
                                                "qsa": qsa_status})
                    if name == "sel_criteria":
                        cat = sel.catalogue_all(audits_root, audit_id) if audit_id else sel.catalogue_all(audits_root, "NONE")
                        draft = sel.read_draft(audits_root, audit_id) if audit_id else {"selected": [], "additions": []}
                        rows = [{k: c.get(k) for k in ("criterion_id", "source_sheet", "criteria_ref", "source_label", "kind",
                                                       "origin", "question", "licence_use", "licence_owner", "status")}
                                for c in cat]
                        return self._json(200, {"sources": sel.sources_summary(cat), "criteria": rows,
                                                "selected": draft["selected"]})
                    if name == "sel_start":
                        return self._json(200, qsa.start_audit(audits_root, audit_id, qsa.load_checklist()))
                    if name == "qsa_status":
                        return self._json(200, qr.status(audits_root, audit_id, qsa.load_checklist()))
                except ValueError as exc:
                    return self._fail(exc, default=400)
                return self._json(404, {"errors": ["not found"]})
            raw = unquote(urlparse(self.path).path)
            clean = posixpath.normpath(raw).lstrip("/")
            if clean in (".", ""):
                self.send_response(302)
                self.send_header("Location", "/prototype/index.html")
                self.end_headers()
                return
            if not _is_static_allowed(clean):
                return self._json(404, {"errors": ["not found"]})
            self.path = "/" + clean
            return super().do_GET()

        def do_POST(self):
            if not self._origin_ok():
                return self._json(403, {"errors": ["origin not allowed"]})
            route = self._route()
            if route is None or route[0] in ("qsa_criteria", "unknown_api", "qsa_start", "qsa_status", "sel_criteria", "sel_start", "step_review", "plan_get", "step_report", "step_progress"):
                return self._json(404, {"errors": ["not found"]})
            name, audit_id = route
            try:
                body = self._body()
                if name == "records":
                    record = body.get("record")
                    if not isinstance(record, dict):
                        return self._json(400, {"errors": ["record must be an object"]})
                    entry = lg.append(audits_root, audit_id, body.get("record_type"), record)
                    return self._json(201, entry)
                checklist = qsa.load_checklist()
                if name == "qsa_selection":
                    with _DRAFT_LOCK:
                        draft = qsa.read_draft(audits_root, audit_id)
                        cat = qsa.catalogue(checklist, draft)
                        new = qsa.apply_action(draft, cat, body.get("action"), ids=body.get("ids"), element=body.get("element"))
                        qsa.write_draft(audits_root, audit_id, new)
                    return self._json(200, _criteria_view(checklist, new, _latest_publication(audits_root, audit_id)))
                if name == "qsa_additions":
                    with _DRAFT_LOCK:
                        draft = qsa.read_draft(audits_root, audit_id)
                        now = datetime.now().isoformat(timespec="seconds")
                        new = qsa.add_additional(draft, body.get("label"), body.get("question"), body.get("source_citation"), now)
                        qsa.write_draft(audits_root, audit_id, new)
                    return self._json(201, _criteria_view(checklist, new, _latest_publication(audits_root, audit_id)))
                if name == "qsa_publish":
                    result = qsa.publish(audits_root, audit_id, checklist)
                    return self._json(201, result)
                now = datetime.now().isoformat(timespec="seconds")
                if name == "step_setup":
                    entry = su.record_setup(audits_root, audit_id, body, now)
                    return self._json(201, entry)
                if name == "step_status":
                    if body.get("status") == "IN_PROGRESS":
                        state = pl.planning_state(audits_root, audit_id)
                        if not state["ready"]:
                            return self._json(422, {"errors": ["planning is not complete: " + "; ".join(state["reasons"])]})
                    entry = su.change_status(audits_root, audit_id, body.get("status"), body.get("changed_by"), now)
                    return self._json(201, entry)
                if name == "plan_manual":
                    return self._json(201, pl.record_manual(audits_root, audit_id, body, now))
                if name == "plan_exclusions":
                    return self._json(201, pl.propose_exclusion(audits_root, audit_id, body, now))
                if name == "plan_review":
                    return self._json(201, pl.review_exclusion(audits_root, audit_id, body.get("exclusion_id"),
                                                               body.get("action"), body.get("reviewer"),
                                                               body.get("note"), body.get("amended"), now))
                if name == "plan_complete":
                    return self._json(201, pl.complete_review(audits_root, audit_id, body.get("reviewer"), now))
                if name == "step_snapshot":
                    return self._json(201, rv.take_snapshot(audits_root, audit_id, body.get("standard")))
                if name == "step_export":
                    return self._json(201, rv.export_package(audits_root, audit_id, body.get("recipient"), checklist, now))
                if name == "sel_action":
                    new = sel.apply_action(audits_root, audit_id, body.get("action"), ids=body.get("ids"),
                                           element=body.get("element"))
                    return self._json(200, {"selected": new["selected"]})
                if name == "sel_publish":
                    return self._json(201, sel.publish(audits_root, audit_id, now=now))
                if name == "qsa_assessments":
                    entry = qr.record_assessment(audits_root, audit_id, checklist, body, now)
                    return self._json(201, entry)
                if name == "qsa_findings":
                    entry = qr.record_finding(audits_root, audit_id, checklist, body, now)
                    return self._json(201, entry)
                if name == "qsa_classify":
                    entry = qr.classify_finding(audits_root, audit_id, checklist, body.get("finding_id"),
                                                body.get("classification"), body.get("classified_by"),
                                                body.get("role"), now)
                    return self._json(201, entry)
                return self._json(404, {"errors": ["not found"]})
            except OverflowError as exc:
                return self._fail(exc)
            except ValueError as exc:
                return self._fail(exc)

    return Handler


def make_server(port=0, product_root=ROOT, audits_root=None):
    """Bind to 127.0.0.1. Returns the server; its URL is http://127.0.0.1:<port>."""
    audits_root = Path(audits_root) if audits_root is not None else product_root / "audits"
    allowed = set()
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(product_root, audits_root, allowed))
    actual = server.server_address[1]
    allowed.update({f"http://127.0.0.1:{actual}", f"http://localhost:{actual}"})
    return server


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    srv = make_server(port)
    print(f"Pocket Auditor recorder on http://127.0.0.1:{srv.server_address[1]}/prototype/capture.html", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
