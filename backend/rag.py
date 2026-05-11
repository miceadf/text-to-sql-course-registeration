schema_docs = [
    "course_offerings: 강의 개설 정보, 시간, 교수, 정원",
    "subject: 과목 정보, 학점, 이름",
    "department: 학과 정보",
    "enrollment: 수강 정보",
    "course_prerequisite: 선수과목",
]

def _tokenize(text: str) -> set[str]:
    return {tok for tok in text.lower().replace(":", " ").replace(",", " ").split() if tok}


def retrieve_schema(query, top_k=2):
    q_tokens = _tokenize(query)
    if not q_tokens:
        return schema_docs[:top_k]

    scores = []
    for doc in schema_docs:
        d_tokens = _tokenize(doc)
        overlap = len(q_tokens.intersection(d_tokens))
        scores.append((doc, overlap))
    scores.sort(key=lambda x: x[1], reverse=True)
    selected = [doc for doc, score in scores[:top_k] if score > 0]
    return selected if selected else schema_docs[:top_k]
