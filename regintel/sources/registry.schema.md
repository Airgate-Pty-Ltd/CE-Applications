# Collector Record Schema

Every source in `registry.json` follows this shape (Brian's collector schema).

```yaml
source_id: FAA-RULEMAKING-001          # stable id
authority: Federal Aviation Administration
jurisdiction: United States
industry: [Aerospace]                  # Universal|Aerospace|Automotive|Medical device|Mining|Standards
source_name: FAA Recently Published Rulemaking Documents
source_type: [Proposed Rule, Final Rule, Notice]
url: https://www.faa.gov/regulations_policies/rulemaking/recently_published
official_domain: faa.gov
authority_level: Primary
cross_reference: [ ... ]               # extra URLs on the directory row
purpose: "..."                          # pull purpose from the directory
retrieval_method: HTML                  # HTML|JSON|RSS|Atom/XML
structured_api_available: false
login_required: false
recommended_frequency: Daily
change_detection: [New document row, Publication date change, Comment deadline change, Link replacement]
retain_original: true
human_validation_required: true

# Filled by healthcheck.py:
last_checked: 2026-07-24T22:27:00Z
last_status: ok                         # ok|redirected|blocked|dead|server_error|unreachable
last_ok: true
last_http: 200
last_final_url: null                    # set when redirected
consecutive_failures: 0

# Filled by enrichment when verified:
api_note: "openFDA API"
build_status: "BUILT (FAA)"
```

## Fields the master register should still add per source

Exact RSS address · API endpoint · email-subscription location · HTML selector /
container id · pagination behaviour · authentication requirement · robots &
copyright limits · language / translation handling · polling frequency · fallback
URL · last successful connection · failure status · source owner · parser type ·
duplicate-detection method.

These are populated as each source is actually built.
