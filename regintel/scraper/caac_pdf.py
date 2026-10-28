"""Read the text of a CAAC PDF attachment.

WHY THIS EXISTS
CAAC publishes laws as inline HTML, but advisory circulars, CCAR rules and
technical standards as a stub page whose text lives entirely in a PDF. Without
this, those findings carry a title and a link and nothing else.

TEXT LAYER FIRST, OCR ONLY FOR SCANS
The two are not interchangeable and the order is deliberate:

  * Most CAAC PDFs carry a real text layer. AP-21-11R2 is 233 pages extracting
    ~1,500 clean characters each. Reading that layer is exact and repeatable.
    Running OCR over it would be strictly worse — it would introduce
    recognition errors into text that can be read perfectly.

  * Some are scans. CTSO-C63f extracts zero characters: it is page images.
    There, OCR is the only option, and macOS Vision handles Simplified Chinese
    well (it read 风切变探测, 湍流, 失效状态 and the CTSO number correctly).

OCR IS NOT EXACT, AND IS LABELLED
On a single test page Vision produced `飞飞行引导系统` — a doubled character.
Harmless there; the same slip in a clause reference or a figure would not be.
So OCR output is always marked as OCR-derived, and NEVER feeds a load-bearing
field. Document numbers and dates come from the listing metadata, which CAAC
publishes as text and which we already read exactly.

This is the "PDF as the exception" case the ingestion architecture allows: for
these documents there is no structured equivalent — the PDF is the only form
CAAC publishes. No model is involved either way: a text layer is a copy, and
OCR is character recognition, not generation.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)

# Below this many characters across the sampled pages, treat the PDF as a scan.
# A text-layer PDF yields well over a thousand characters per page; a scan
# yields zero. The threshold only has to separate those two.
TEXT_LAYER_MIN_CHARS = 200

# Enough to characterise a document without reading a 233-page procedure.
DEFAULT_MAX_PAGES = 3

CACHE_DIR = Path(os.environ.get(
    "REGINTEL_CACHE",
    Path(__file__).resolve().parent / ".cache" / "caac-pdf",
))


@dataclass
class PdfText:
    text: str
    method: str          # 'text_layer' | 'ocr' | 'none'
    pages_read: int = 0

    @property
    def is_exact(self) -> bool:
        """True when the text was copied rather than recognised."""
        return self.method == "text_layer"


def _cache_path(url: str) -> Path:
    return CACHE_DIR / (hashlib.sha256(url.encode()).hexdigest()[:32] + ".json")


def _read_cache(url: str) -> PdfText | None:
    p = _cache_path(url)
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
        return PdfText(d["text"], d["method"], d.get("pages_read", 0))
    except Exception:  # noqa: BLE001 — a cache miss is not an error
        return None


def _write_cache(url: str, result: PdfText) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _cache_path(url).write_text(json.dumps({
            "url": url, "text": result.text,
            "method": result.method, "pages_read": result.pages_read,
        }, ensure_ascii=False), encoding="utf-8")
    except Exception as exc:  # noqa: BLE001 — caching is an optimisation
        log.debug("could not cache %s (%s)", url, exc)


def extract_text_layer(data: bytes, max_pages: int = DEFAULT_MAX_PAGES) -> PdfText:
    """Read the PDF's embedded text. Exact where it exists."""
    try:
        from pypdf import PdfReader
    except ImportError:
        log.warning("pypdf not installed; cannot read PDF text layers")
        return PdfText("", "none")

    import io

    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001
        log.debug("unreadable PDF (%s)", exc)
        return PdfText("", "none")

    parts, pages = [], 0
    for page in reader.pages[:max_pages]:
        try:
            parts.append(page.extract_text() or "")
        except Exception:  # noqa: BLE001 — one bad page must not lose the rest
            continue
        pages += 1
    text = _tidy("\n".join(parts))
    if len(text) < TEXT_LAYER_MIN_CHARS:
        return PdfText("", "none", pages)
    return PdfText(text, "text_layer", pages)


def ocr(data: bytes, max_pages: int = DEFAULT_MAX_PAGES) -> PdfText:
    """Recognise text from page images using macOS Vision.

    Only reached when the PDF has no text layer. Requires macOS; returns an
    empty result elsewhere rather than failing the run.
    """
    try:
        import Quartz
        import Vision
        from Foundation import NSData
    except ImportError:
        log.info("macOS Vision unavailable; scanned PDF left unread")
        return PdfText("", "none")

    try:
        provider = Quartz.CGDataProviderCreateWithCFData(NSData.dataWithBytes_length_(data, len(data)))
        doc = Quartz.CGPDFDocumentCreateWithProvider(provider)
        if doc is None:
            return PdfText("", "none")
        total = Quartz.CGPDFDocumentGetNumberOfPages(doc)
    except Exception as exc:  # noqa: BLE001
        log.debug("could not open PDF for OCR (%s)", exc)
        return PdfText("", "none")

    lines: list[str] = []
    pages = 0
    for n in range(1, min(max_pages, total) + 1):
        try:
            lines.extend(_ocr_page(Quartz, Vision, doc, n))
            pages += 1
        except Exception as exc:  # noqa: BLE001
            log.debug("OCR failed on page %d (%s)", n, exc)

    text = _tidy("\n".join(lines))
    return PdfText(text, "ocr", pages) if text else PdfText("", "none", pages)


def _ocr_page(Quartz, Vision, doc, number: int, scale: float = 3.0) -> list[str]:
    """Render one page and recognise its text.

    Rendered at 3x: at native resolution Vision misses small CJK glyphs.
    """
    page = Quartz.CGPDFDocumentGetPage(doc, number)
    rect = Quartz.CGPDFPageGetBoxRect(page, Quartz.kCGPDFMediaBox)
    w, h = int(rect.size.width * scale), int(rect.size.height * scale)
    if w <= 0 or h <= 0 or w * h > 80_000_000:      # guard against absurd pages
        return []

    cs = Quartz.CGColorSpaceCreateDeviceRGB()
    ctx = Quartz.CGBitmapContextCreate(None, w, h, 8, 0, cs, Quartz.kCGImageAlphaNoneSkipLast)
    Quartz.CGContextSetRGBFillColor(ctx, 1, 1, 1, 1)
    Quartz.CGContextFillRect(ctx, Quartz.CGRectMake(0, 0, w, h))
    Quartz.CGContextScaleCTM(ctx, scale, scale)
    Quartz.CGContextDrawPDFPage(ctx, page)
    image = Quartz.CGBitmapContextCreateImage(ctx)

    request = Vision.VNRecognizeTextRequest.alloc().init()
    request.setRecognitionLevel_(0)                  # accurate, not fast
    request.setRecognitionLanguages_(["zh-Hans", "en-US"])
    request.setUsesLanguageCorrection_(True)
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(image, None)
    handler.performRequests_error_([request], None)

    out = []
    for observation in request.results() or []:
        candidates = observation.topCandidates_(1)
        if candidates:
            out.append(candidates[0].string())
    return out


# CJK ranges wide enough for the Han, punctuation and full-width forms CAAC uses.
_CJK = r"\u3000-\u303f\u4e00-\u9fff\uff00-\uffef"


def _tidy(text: str) -> str:
    """Normalise extracted text.

    CAAC's PDFs position every glyph individually, so the text layer comes back
    with a space between each character — "管 理 程 序", "2 0 2 6 年". Those
    spaces are a rendering artefact, not the publisher's words, and they make
    the text unreadable and unsearchable. Collapse them where both sides are
    CJK, and inside runs of digits, while leaving real spaces in Latin text.
    """
    text = re.sub(r"[ \t　]+", " ", text)
    for _ in range(2):   # a second pass catches overlapping neighbours
        text = re.sub(rf"(?<=[{_CJK}]) (?=[{_CJK}])", "", text)
    text = re.sub(r"(?<=\d) (?=\d)", "", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def text_for(url: str, fetch, max_pages: int = DEFAULT_MAX_PAGES,
             use_ocr: bool = True) -> PdfText:
    """Text of a PDF attachment: text layer if present, OCR if it is a scan.

    Cached on disk by URL. These attachments run to several megabytes and OCR
    costs seconds per page, so re-reading an unchanged document on every daily
    run would be pure waste.
    """
    cached = _read_cache(url)
    if cached is not None:
        return cached

    try:
        data = fetch(url).content
    except Exception as exc:  # noqa: BLE001 — never let one attachment sink a run
        log.debug("could not fetch %s (%s)", url, exc)
        return PdfText("", "none")

    result = extract_text_layer(data, max_pages)
    if result.method == "none" and use_ocr:
        log.info("no text layer, running OCR: %s", url.rsplit("/", 1)[-1])
        result = ocr(data, max_pages)

    _write_cache(url, result)
    return result
