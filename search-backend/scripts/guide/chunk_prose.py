# -*- coding: utf-8 -*-
"""서술형 PDF -> RAG 청크(JSON). 페이지 메타 유지, 문단 기반 ~800자 청크 + 겹침.

실행:
  pip install pdfplumber
  GUIDE_PDF_DIR=/경로/원본PDF폴더 python3 chunk_prose.py
파일은 이름 키워드로 문서를 자동 분류한다.
"""
import pdfplumber, json, re, os

SRC = os.environ.get("GUIDE_PDF_DIR", "./pdf")
OUT = os.environ.get("GUIDE_OUT_DIR", os.path.join(os.path.dirname(__file__), "out"))
os.makedirs(OUT, exist_ok=True)

# (파일명 키워드들, (doc, title))
PROSE_RULES = [
    (["계열별", "분석"], ("계열별분석", "2027 수시 계열별 분석(총론)")),
    (["상담"], ("상담자료집", "2027 대입상담 역량강화 자료집")),
    (["지역의사"], ("지역의사안내", "2027 지역의사 선발전형 안내")),
]
MAXLEN = 800
OVERLAP = 120

def doc_of(name):
    for kws, meta in PROSE_RULES:
        if all(k in name for k in kws):
            return meta
    return None

def clean(t):
    t = t.replace("…", ".")
    t = re.sub(r"[.·‧]{2,}", " ", t)   # 점선 리더 제거
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r" ?\n ?", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()

chunks, report = [], []
for name in sorted(os.listdir(SRC)):
    if not name.lower().endswith(".pdf"):
        continue
    meta = doc_of(name)
    if not meta:
        continue
    cat, title = meta
    pdf = pdfplumber.open(os.path.join(SRC, name))
    n = 0
    for pno, page in enumerate(pdf.pages, 1):
        txt = clean(page.extract_text() or "")
        if len(txt) < 60:
            continue
        letters = len(re.findall(r"[가-힣A-Za-z]", txt))
        if letters < len(txt) * 0.4:   # 목차/점선/숫자 위주 페이지 스킵
            continue
        paras = [p.strip() for p in txt.split("\n") if p.strip()]
        buf = ""
        for p in paras:
            if len(buf) + len(p) + 1 <= MAXLEN:
                buf += (" " if buf else "") + p
            else:
                if buf:
                    chunks.append({"doc": cat, "title": title, "page": pno, "text": buf})
                    n += 1
                    buf = buf[-OVERLAP:] + " " + p
                else:
                    buf = p
        if buf.strip():
            chunks.append({"doc": cat, "title": title, "page": pno, "text": buf})
            n += 1
    report.append((cat, len(pdf.pages), n))

for i, c in enumerate(chunks):
    c["chunk_id"] = i

with open(os.path.join(OUT, "guide_knowledge_chunks.json"), "w", encoding="utf-8") as f:
    json.dump(chunks, f, ensure_ascii=False, indent=1)

tot = sum(len(c["text"]) for c in chunks)
print(f"{'문서':<14}{'pages':>6}{'chunks':>8}")
for c, p, n in report:
    print(f"{c:<14}{p:>6}{n:>8}")
print("-" * 30)
print(f"총 청크 {len(chunks)}개, 총 {tot:,}자")
