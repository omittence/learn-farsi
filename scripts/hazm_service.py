"""Persistent hazm NLP service — JSON-lines protocol over stdin/stdout.

Each input line is a JSON object: {"text": "...", "split_on_newlines": false}
Each output line is a JSON object with normalized text, sentences, and token analysis.

Set split_on_newlines=true for poems where line breaks define sentence boundaries.
"""

import json
import sys

from hazm import (
    DependencyParser,
    Lemmatizer,
    Normalizer,
    POSTagger,
    SentenceTokenizer,
    WordTokenizer,
)

POS_MAP = {
    "N": "noun",
    "Ne": "noun",
    "V": "verb",
    "AJ": "adjective",
    "AJe": "adjective",
    "ADV": "adverb",
    "ADVe": "adverb",
    "P": "preposition",
    "Pe": "preposition",
    "CONJ": "conjunction",
    "CONJe": "conjunction",
    "PRO": "pronoun",
    "PROe": "pronoun",
    "NUM": "number",
    "NUMe": "number",
    "DET": "determiner",
    "DETe": "determiner",
    "POSTP": "postposition",
    "POSTPe": "postposition",
    "PUNC": "punctuation",
    "INT": "interjection",
    "CL": "classifier",
    "RES": "residual",
}


def map_pos(tag: str) -> str:
    """Map hazm's internal POS tag to a learner-friendly label."""
    base = tag.split(",")[0].strip()
    return POS_MAP.get(base, "particle")


def init_models():
    """Load all hazm models once at startup."""
    normalizer = Normalizer()
    word_tokenizer = WordTokenizer()
    sent_tokenizer = SentenceTokenizer()
    lemmatizer = Lemmatizer()
    tagger = POSTagger(model="pos_tagger.model")
    parser = DependencyParser(model="dependency_parser.model")
    return normalizer, word_tokenizer, sent_tokenizer, lemmatizer, tagger, parser


def analyze_sentence(text, word_tokenizer, lemmatizer, tagger, parser):
    """Analyze a single sentence, returning token-level annotations."""
    words = word_tokenizer.tokenize(text)
    if not words:
        return []

    tagged = tagger.tag(words)
    try:
        parsed = parser.parse(tagged)
        deps = list(parsed.triples()) if parsed else []
    except Exception:
        deps = []

    # Build dependency info from the parse tree
    # parsed is a DependencyGraph; extract head/rel per token
    dep_info = []
    if parsed and hasattr(parsed, "nodelist"):
        for node in parsed.nodelist[1:]:  # skip root node at index 0
            dep_info.append(
                {"head": node.get("head", 0), "rel": node.get("rel", "dep")}
            )
    else:
        dep_info = [{"head": 0, "rel": "dep"} for _ in words]

    tokens = []
    for i, (word, tag) in enumerate(tagged):
        lemma = lemmatizer.lemmatize(word, tag.split(",")[0].strip())
        info = dep_info[i] if i < len(dep_info) else {"head": 0, "rel": "dep"}
        tokens.append(
            {
                "surface": word,
                "lemma": lemma if lemma != word else word,
                "pos": map_pos(tag),
                "pos_tag": tag,
                "dep_head": info["head"],
                "dep_rel": info["rel"],
            }
        )

    return tokens


def process(text, split_on_newlines, normalizer, word_tokenizer, sent_tokenizer, lemmatizer, tagger, parser):
    """Process a text and return structured NLP analysis."""
    normalized = normalizer.normalize(text)

    if split_on_newlines:
        raw_sentences = [line.strip() for line in normalized.split("\n") if line.strip()]
    else:
        raw_sentences = sent_tokenizer.tokenize(normalized)

    sentences = []
    for sent_text in raw_sentences:
        tokens = analyze_sentence(sent_text, word_tokenizer, lemmatizer, tagger, parser)
        sentences.append({"text": sent_text, "tokens": tokens})

    return {"normalized_text": normalized, "sentences": sentences}


def main():
    sys.stderr.write("hazm_service: loading models...\n")
    normalizer, word_tokenizer, sent_tokenizer, lemmatizer, tagger, parser = init_models()
    sys.stderr.write("hazm_service: ready\n")
    sys.stdout.write('{"status":"ready"}\n')
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
            text = req.get("text", "")
            split_on_newlines = req.get("split_on_newlines", False)

            if not text:
                result = {"normalized_text": "", "sentences": []}
            else:
                result = process(
                    text, split_on_newlines,
                    normalizer, word_tokenizer, sent_tokenizer,
                    lemmatizer, tagger, parser,
                )

            sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
            sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(json.dumps({"error": str(e)}) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
