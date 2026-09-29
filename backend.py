# ============================================================
# 🌐 Smart Document Assistant - Python AI Backend
# Adapted from Smart_Document_Assistant.ipynb
#
# Modules:
# 1. PDF Text Extraction      -> PyMuPDF (fitz)
# 2. Language Detection       -> langdetect
# 3. Text Chunking            -> Sliding window (1000 chars, 200 overlap)
# 4. Multilingual Embeddings  -> Sentence Transformers (paraphrase-multilingual-MiniLM-L12-v2)
# 5. Vector Search            -> FAISS (IndexFlatIP)
# 6. Indic NLP                -> IndicBERT (ai4bharat/indic-bert)
# 7. Speech-to-Text           -> Whisper (openai/whisper-tiny)
# 8. Document QA              -> Qwen (Qwen/Qwen2.5-0.5B-Instruct)
# 9. Translation              -> NLLB-200 (facebook/nllb-200-distilled-600M)
# 10. REST API + Gradio       -> FastAPI & Gradio
#
# Supported Languages: English / Kannada (ಕನ್ನಡ) / Hindi (हिंदी)
# ============================================================

import os
import gc
import tempfile
import numpy as np
import torch
import fitz # PyMuPDF
import faiss
from langdetect import detect

from transformers import (
    AutoTokenizer,
    AutoModel,
    AutoModelForCausalLM,
    AutoModelForSeq2SeqLM,
    pipeline
)
from sentence_transformers import SentenceTransformer

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

os.environ["TOKENIZERS_PARALLELISM"] = "false"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print("=" * 70)
print("# 🤖 SMART DOCUMENT ASSISTANT - AI BACKEND")
print("=" * 70)
print("Device:", DEVICE)
print("PyTorch:", torch.__version__)

# ------------------------------------------------------------
# HUGGING FACE TOKEN
# ------------------------------------------------------------
HF_TOKEN = os.environ.get("HF_TOKEN", None)

# ------------------------------------------------------------
# LOAD MULTILINGUAL EMBEDDING MODEL
# ------------------------------------------------------------
print("\n⏳ Loading multilingual embedding model...")
try:
    embedding_model = SentenceTransformer(
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        device=DEVICE
    )
    print("✅ Embedding model loaded")
except Exception as e:
    print("⚠️ Embedding model failed to load:", e)
    embedding_model = None

# ------------------------------------------------------------
# LOAD INDICBERT
# ------------------------------------------------------------
print("\n⏳ Loading IndicBERT...")
indicbert_tokenizer = None
indicbert_model = None
INDICBERT_STATUS = ""

try:
    indicbert_tokenizer = AutoTokenizer.from_pretrained(
        "ai4bharat/indic-bert",
        token=HF_TOKEN
    )
    indicbert_model = AutoModel.from_pretrained(
        "ai4bharat/indic-bert",
        token=HF_TOKEN
    ).to(DEVICE)
    indicbert_model.eval()
    INDICBERT_STATUS = "✅ IndicBERT loaded successfully"
    print(INDICBERT_STATUS)
except Exception as e:
    INDICBERT_STATUS = f"⚠️ IndicBERT could not be loaded: {str(e)}"
    print(INDICBERT_STATUS)

def indicbert_encode(text):
    if indicbert_tokenizer is None or indicbert_model is None:
        return None
    if not text or not text.strip():
        return None
    try:
        inputs = indicbert_tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=256
        ).to(DEVICE)
        with torch.no_grad():
            outputs = indicbert_model(**inputs)
        hidden = outputs.last_hidden_state
        attention_mask = inputs["attention_mask"].unsqueeze(-1)
        masked_hidden = hidden * attention_mask
        pooled = (
            masked_hidden.sum(dim=1)
            /
            attention_mask.sum(dim=1).clamp(min=1)
        )
        return pooled.cpu().numpy()[0]
    except Exception as e:
        print("IndicBERT encode error:", e)
        return None

# ------------------------------------------------------------
# LOAD QWEN
# ------------------------------------------------------------
print("\n⏳ Loading Qwen...")
qwen_name = "Qwen/Qwen2.5-0.5B-Instruct"
try:
    qwen_tokenizer = AutoTokenizer.from_pretrained(qwen_name)
    qwen_model = AutoModelForCausalLM.from_pretrained(
        qwen_name,
        torch_dtype=torch.float32
    ).to(DEVICE)
    qwen_model.eval()
    print("✅ Qwen loaded")
except Exception as e:
    print("⚠️ Qwen failed to load:", e)
    qwen_tokenizer = None
    qwen_model = None

# ------------------------------------------------------------
# LOAD NLLB TRANSLATION MODEL
# ------------------------------------------------------------
print("\n⏳ Loading NLLB translation model...")
nllb_name = "facebook/nllb-200-distilled-600M"
try:
    nllb_tokenizer = AutoTokenizer.from_pretrained(nllb_name)
    nllb_model = AutoModelForSeq2SeqLM.from_pretrained(
        nllb_name,
        torch_dtype=torch.float32
    ).to(DEVICE)
    nllb_model.eval()
    print("✅ NLLB loaded")
except Exception as e:
    print("⚠️ NLLB failed to load:", e)
    nllb_tokenizer = None
    nllb_model = None

# ------------------------------------------------------------
# LOAD WHISPER
# ------------------------------------------------------------
print("\n⏳ Loading Whisper...")
try:
    whisper_pipe = pipeline(
        "automatic-speech-recognition",
        model="openai/whisper-tiny",
        device=-1 if DEVICE == "cpu" else 0
    )
    print("✅ Whisper loaded")
except Exception as e:
    print("⚠️ Whisper failed to load:", e)
    whisper_pipe = None

# ------------------------------------------------------------
# LANGUAGE CODES & DETECTION
# ------------------------------------------------------------
LANG_CODES = {
    "English": "eng_Latn",
    "Kannada": "kan_Knda",
    "Hindi": "hin_Deva"
}

DETECT_CODES = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati"
}

def detect_language(text):
    if not text or not text.strip():
        return "English"
    try:
        code = detect(text)
        return DETECT_CODES.get(code, "English")
    except Exception:
        return "English"

def translate_nllb(text, source_language, target_language):
    if not text or not text.strip():
        return ""
    if source_language == target_language:
        return text
    if nllb_tokenizer is None or nllb_model is None:
        return text
    if source_language not in LANG_CODES or target_language not in LANG_CODES:
        return text

    source_code = LANG_CODES[source_language]
    target_code = LANG_CODES[target_language]

    try:
        nllb_tokenizer.src_lang = source_code
        inputs = nllb_tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(DEVICE)

        target_token_id = nllb_tokenizer.convert_tokens_to_ids(target_code)

        with torch.no_grad():
            output_tokens = nllb_model.generate(
                **inputs,
                forced_bos_token_id=target_token_id,
                max_length=512,
                num_beams=4
            )

        translated = nllb_tokenizer.batch_decode(
            output_tokens,
            skip_special_tokens=True
        )[0]
        return translated.strip()
    except Exception as e:
        print("Translation error:", e)
        return text

def transcribe_audio(audio_path):
    if audio_path is None or whisper_pipe is None:
        return ""
    try:
        result = whisper_pipe(
            audio_path,
            generate_kwargs={"task": "transcribe"}
        )
        return result["text"].strip()
    except Exception as e:
        return f"[Speech error: {str(e)}]"

def split_into_chunks(text, chunk_size=1000, overlap=200):
    text = " ".join(text.split())
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += (chunk_size - overlap)
    return chunks

# ------------------------------------------------------------
# DOCUMENT STATE
# ------------------------------------------------------------
current_chunks = []
current_index = None
current_document_language = "English"
current_pdf_path = None
current_metadata = {
    "pages": 0,
    "chars": 0,
    "chunks": 0,
    "language": "English",
    "indicbert": "Not processed"
}

def process_pdf(pdf_path):
    global current_chunks
    global current_index
    global current_document_language
    global current_pdf_path
    global current_metadata

    if pdf_path is None:
        return {"error": "Please upload a PDF."}

    try:
        current_pdf_path = pdf_path
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        all_text = ""

        page_texts = []
        for page_number, page in enumerate(doc):
            p_text = page.get_text()
            page_texts.append({"page": page_number + 1, "text": p_text})
            all_text += f"\n\n--- Page {page_number + 1} ---\n\n" + p_text
        doc.close()

        clean_text = " ".join(all_text.split())
        if len(clean_text) < 50:
            return {
                "error": "Very little text was extracted. This appears to be a scanned/image PDF. OCR is required."
            }

        current_document_language = detect_language(clean_text)
        current_chunks = split_into_chunks(all_text, chunk_size=1000, overlap=200)

        if embedding_model is not None:
            embeddings = embedding_model.encode(
                current_chunks,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False
            ).astype("float32")
            dimension = embeddings.shape[1]
            current_index = faiss.IndexFlatIP(dimension)
            current_index.add(embeddings)
            del embeddings
            gc.collect()

        indicbert_message = "Not available"
        if indicbert_model is not None:
            sample_text = clean_text[:500]
            rep = indicbert_encode(sample_text)
            if rep is not None:
                indicbert_message = f"Representation created ({len(rep)} dimensions)"

        current_metadata = {
            "pages": page_count,
            "chars": len(clean_text),
            "chunks": len(current_chunks),
            "language": current_document_language,
            "indicbert": indicbert_message
        }

        return {
            "success": True,
            "status_text": (
                "✅ DOCUMENT PROCESSED\n\n"
                f"📄 Pages: {page_count}\n"
                f"📝 Characters: {len(clean_text)}\n"
                f"📚 Chunks: {len(current_chunks)}\n"
                f"🌐 Language: {current_document_language}\n"
                f"🧠 IndicBERT: {indicbert_message}"
            ),
            "metadata": current_metadata
        }
    except Exception as e:
        return {"error": f"PDF Processing Error: {str(e)}"}

def search_document(question, top_k=3):
    if current_index is None or embedding_model is None or len(current_chunks) == 0:
        return []

    question_embedding = embedding_model.encode(
        [question],
        convert_to_numpy=True,
        normalize_embeddings=True
    ).astype("float32")

    k = min(top_k, len(current_chunks))
    scores, indices = current_index.search(question_embedding, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0:
            continue
        results.append({
            "score": float(score),
            "chunk": current_chunks[idx],
            "index": int(idx)
        })
    return results

def generate_answer(question, context):
    if qwen_tokenizer is None or qwen_model is None:
        return "Qwen model not loaded. Please ensure Qwen is running."

    system_prompt = (
        "You are a document question-answering assistant.\n\n"
        "Use ONLY the provided document context.\n\n"
        "Rules:\n"
        "- Do not invent facts.\n"
        "- Do not use outside knowledge.\n"
        "- Give a clear and simple answer.\n"
        "- If the information is not present, say:\n"
        "  \"The answer is not available in the document.\""
    )

    user_prompt = f"DOCUMENT CONTEXT:\n{context}\n\nQUESTION:\n{question}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    prompt = qwen_tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = qwen_tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=4096
    ).to(DEVICE)

    with torch.no_grad():
        outputs = qwen_model.generate(
            **inputs,
            max_new_tokens=250,
            do_sample=False
        )

    new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
    answer = qwen_tokenizer.decode(new_tokens, skip_special_tokens=True)
    return answer.strip()

def answer_question(question, target_language):
    global current_document_language

    if current_index is None:
        return {
            "answer": "Please upload and process a PDF first.",
            "sources": []
        }

    if not question or not question.strip():
        return {
            "answer": "Please enter or speak a question.",
            "sources": []
        }

    question_language = detect_language(question)

    if question_language == "English":
        english_question = question
    elif question_language in LANG_CODES:
        english_question = translate_nllb(question, question_language, "English")
    else:
        english_question = question

    results = search_document(english_question, top_k=3)

    if not results:
        return {
            "answer": "The answer is not available in the document.",
            "sources": []
        }

    context = "\n\n".join(r["chunk"] for r in results)

    if current_document_language in LANG_CODES and current_document_language != "English":
        english_context = translate_nllb(context, current_document_language, "English")
    else:
        english_context = context

    if indicbert_model is not None:
        _ = indicbert_encode(question)

    english_answer = generate_answer(english_question, english_context)

    if target_language == "English":
        final_answer = english_answer
    else:
        final_answer = translate_nllb(english_answer, "English", target_language)

    return {
        "answer": final_answer,
        "question": question,
        "english_question": english_question,
        "question_language": question_language,
        "target_language": target_language,
        "sources": results
    }

# ------------------------------------------------------------
# FASTAPI APP
# ------------------------------------------------------------
app = FastAPI(title="Smart Document Assistant Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "device": DEVICE,
        "models": {
            "embedding": embedding_model is not None,
            "indicbert": indicbert_model is not None,
            "qwen": qwen_model is not None,
            "nllb": nllb_model is not None,
            "whisper": whisper_pipe is not None
        },
        "document_loaded": current_index is not None,
        "document_metadata": current_metadata
    }

@app.post("/api/process_pdf")
async def api_process_pdf(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = process_pdf(tmp_path)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

class AskRequest(BaseModel):
    typed_question: Optional[str] = ""
    answer_language: str = "English"

@app.post("/api/ask_ai")
def api_ask_ai(req: AskRequest):
    res = answer_question(req.typed_question, req.answer_language)
    return res

@app.post("/api/transcribe_audio")
async def api_transcribe(audio: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        transcription = transcribe_audio(tmp_path)
        return {"text": transcription}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting Python AI Backend server on http://0.0.0.0:7860...")
    uvicorn.run(app, host="0.0.0.0", port=7860)
