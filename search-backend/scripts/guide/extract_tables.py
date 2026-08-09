# -*- coding: utf-8 -*-
"""정형 목록형 PDF -> 정제 행(JSON/CSV). 지역/대학 forward-fill, 카테고리 태깅.

실행:
  pip install pdfplumber
  GUIDE_PDF_DIR=/경로/원본PDF폴더 python3 extract_tables.py
파일은 이름 키워드로 카테고리를 자동 분류한다(파일명이 바뀌어도 키워드만 맞으면 됨).
"""
import pdfplumber, json, csv, re, os

SRC = os.environ.get("GUIDE_PDF_DIR", "./pdf")
OUT = os.environ.get("GUIDE_OUT_DIR", os.path.join(os.path.dirname(__file__), "out"))
os.makedirs(OUT, exist_ok=True)

# (파일명에 포함된 키워드들, 카테고리 라벨). 위에서부터 먼저 매칭.
LIST_RULES = [
    (["기초생활", "차상위", "한부모"], "기초생활수급자·차상위·한부모"),
    (["기회균형"], "기회균형통합"),
    (["농어촌"], "농어촌학생"),
    (["다문화"], "다문화학생"),
    (["장애인"], "장애인등"),
    (["특성화고"], "특성화고졸업자"),
    (["지역인재"], "지역인재"),
    (["미술계열"], "예체능-미술계열(비실기)"),
    (["연기", "연출"], "예체능-연기연출계열(비실기)"),
    (["음악계열"], "예체능-음악계열(비실기)"),
    (["응용예술"], "예체능-응용예술계열(비실기)"),
    (["체육계열"], "예체능-체육계열(비실기)"),
    (["전공자율선택"], "예체능-전공자율선택제(비실기)"),
]
# 서술형(RAG)으로 보내는 파일은 여기서 제외
PROSE_HINT = ["계열별 분석", "상담", "지역의사"]

def category_of(name):
    if any(h in name for h in PROSE_HINT):
        return None
    for kws, label in LIST_RULES:
        if all(k in name for k in kws):
            return label
    return None

def norm(c):
    return re.sub(r"\s+", " ", (c or "").replace("\n", " ")).strip()

HEADER_HINT = {"지역", "대학", "전형", "전형명", "전형유형", "모집인원", "전형방법",
               "비고", "계열", "권역", "모집단위", "수능최저"}

all_rows, report = [], []
for name in sorted(os.listdir(SRC)):
    if not name.lower().endswith(".pdf"):
        continue
    category = category_of(name)
    if not category:
        continue
    path = os.path.join(SRC, name)
    pdf = pdfplumber.open(path)
    header, ffill, rows_this = None, {}, 0
    for pno, page in enumerate(pdf.pages, 1):
        for tbl in (page.extract_tables() or []):
            for r in tbl:
                cells = [norm(c) for c in r]
                if not any(cells):
                    continue
                joined = " ".join(cells)
                is_header = (sum(1 for h in HEADER_HINT if h in joined) >= 2
                             and any(cells[i] in HEADER_HINT for i in range(len(cells))))
                if is_header:
                    header, ffill = cells, {}
                    continue
                if header is None:
                    continue
                cells = (cells + [""] * len(header))[:len(header)]
                for i, h in enumerate(header):
                    if h in ("지역", "대학", "계열", "권역"):
                        if cells[i] == "":
                            cells[i] = ffill.get(i, "")
                        else:
                            ffill[i] = cells[i]
                rowdict = {header[i]: cells[i] for i in range(len(header))}
                if not any(v for k, v in rowdict.items() if k in ("대학", "전형명", "모집단위")):
                    continue
                rowdict.update({"_category": category, "_page": pno, "_source": name})
                all_rows.append(rowdict)
                rows_this += 1
    report.append((category, len(pdf.pages), rows_this))

with open(os.path.join(OUT, "guide_admissions.json"), "w", encoding="utf-8") as f:
    json.dump(all_rows, f, ensure_ascii=False, indent=1)

cols = []
for r in all_rows:
    for k in r:
        if k not in cols:
            cols.append(k)
with open(os.path.join(OUT, "guide_admissions.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(all_rows)

print(f"{'카테고리':<28}{'pages':>6}{'rows':>7}")
for c, p, rc in report:
    print(f"{c:<28}{p:>6}{rc:>7}")
print("-" * 45)
print(f"{'TOTAL 행':<34}{len(all_rows):>13}")
