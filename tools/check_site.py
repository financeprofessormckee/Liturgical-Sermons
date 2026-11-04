"""Check the published Liturgical Sermons site (Python standard library only).

Run from the repository root:  python tools/check_site.py [site-folder]

Checks that every internal link and asset resolves to a file and fragment, that
each HTML page has balanced tags, one <h1>, a title and a description, that
catalog.json is complete with unique identifiers and existing pages, and that the
sitemap lists exactly the published pages. Exits 1 with a list of problems.
"""
import json
import posixpath
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
REQUIRED = ("id", "title", "author", "language", "composition", "historical_occasion",
            "topics", "scripture", "source", "text", "path")


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.stack, self.problems, self.refs, self.ids = [], [], [], set()
        self.h1 = 0
        self.title = self.description = False
        self.feed(text)
        self.close()
        if self.stack:
            self.problems.append("unclosed tags: " + ", ".join(t for t, _ in self.stack[-5:]))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "title":
            self.title = True
        if tag == "meta" and attrs.get("name") == "description" and attrs.get("content"):
            self.description = True
        for name in ("href", "src"):
            if attrs.get(name) and not (tag == "link" and attrs.get("rel") == "canonical"):
                self.refs.append(attrs[name])
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack or self.stack[-1][0] != tag:
            self.problems.append(f"line {self.getpos()[0]}: unexpected </{tag}>")
            if any(t == tag for t, _ in self.stack):
                while self.stack and self.stack[-1][0] != tag:
                    self.stack.pop()
            else:
                return
        self.stack.pop()


def main(site):
    problems, catalog = [], None
    pages = {p.relative_to(site).as_posix(): p for p in site.rglob("*.html") if ".git" not in p.parts}
    parsed = {}
    for name, path in sorted(pages.items()):
        page = parsed[name] = Page(path.read_text(encoding="utf-8"))
        problems += [f"{name}: {p}" for p in page.problems]
        if page.h1 != 1:
            problems.append(f"{name}: {page.h1} <h1> elements")
        if not page.title or not page.description:
            problems.append(f"{name}: missing <title> or meta description")
    for name, page in parsed.items():
        for ref in page.refs:
            parts = urlsplit(ref)
            if parts.scheme or parts.netloc or ref.startswith(("mailto:", "data:")):
                continue
            target = posixpath.normpath(posixpath.join(posixpath.dirname(name), unquote(parts.path))) if parts.path else name
            if target.startswith("../") or not (site / target).is_file():
                problems.append(f"{name}: missing target {ref}")
            elif parts.fragment and target in parsed and parts.fragment not in parsed[target].ids:
                problems.append(f"{name}: missing fragment {ref}")
    catalog_path = site / "catalog.json"
    try:
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        entries = catalog["sermons"]
        ids = [e.get("id") for e in entries]
        problems += [f"catalog.json: duplicate id {i}" for i in sorted({i for i in ids if ids.count(i) > 1})]
        for entry in entries:
            missing = [k for k in REQUIRED if entry.get(k) in (None, "", [])
                       and k not in ("scripture", "topics")]
            missing += [k for k in ("scripture", "topics") if k not in entry]
            if missing:
                problems.append(f"catalog.json: {entry.get('id')} lacks {', '.join(missing)}")
            if entry.get("path") not in pages:
                problems.append(f"catalog.json: {entry.get('id')} path {entry.get('path')} not found")
        sermon_pages = {n for n in pages if n.startswith("sermons/")}
        problems += [f"catalog.json: no entry for {n}" for n in sorted(sermon_pages - {e.get('path') for e in entries})]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        problems.append(f"catalog.json: unreadable ({exc})")
    sitemap = site / "sitemap.xml"
    if sitemap.is_file():
        base = catalog.get("site_url") if isinstance(catalog, dict) else None
        listed = set()
        for chunk in sitemap.read_text(encoding="utf-8").split("<loc>")[1:]:
            url = chunk.split("</loc>")[0]
            path = url[len(base):] if base and url.startswith(base) else None
            listed.add("index.html" if path == "" else path)
        problems += [f"sitemap.xml: lists missing page {p}" for p in sorted(listed - set(pages), key=str)]
        problems += [f"sitemap.xml: omits {p}" for p in sorted(set(pages) - listed)]
    for problem in problems:
        print("FAIL", problem)
    print(f"{'FAILED' if problems else 'PASS'}: {len(pages)} pages, {len(problems)} problems")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main(Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()))
