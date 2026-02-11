# app/core/openai_client.py
from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence, Type, TypeVar

from openai import OpenAI
from pydantic import BaseModel

client = OpenAI()

T = TypeVar("T", bound=BaseModel)


def _normalize_messages(messages: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ensures each message is in the format:
      {"role": "system"|"user"|"assistant", "content": "..."}
    """
    normalized: List[Dict[str, Any]] = []
    for m in messages:
        role = m.get("role")
        content = m.get("content")
        if role is None or content is None:
            raise ValueError(f"Invalid message: {m}")
        normalized.append({"role": role, "content": content})
    return normalized


def _get_attr(obj: Any, key: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _extract_text_from_result(result: Any) -> str:
    parts = _get_attr(result, "content", None) or []
    texts: List[str] = []
    for part in parts:
        if isinstance(part, str):
            part_text = part.strip()
            if part_text:
                texts.append(part_text)
            continue
        text = _get_attr(part, "text", "")
        if text and str(text).strip():
            texts.append(str(text).strip())
    return "\n".join(texts).strip()


def build_vector_store_context(
    *,
    query: str,
    vector_store_id: str,
    max_results: int = 6,
    max_chars_per_result: int = 1200,
) -> tuple[str, Dict[str, Any]]:
    if not query or not query.strip():
        return "", {"vector_store_id": vector_store_id, "query": query, "sources": []}

    results = client.vector_stores.search(
        vector_store_id=vector_store_id,
        query=query,
        max_num_results=max_results,
    )

    data = _get_attr(results, "data", []) or []
    sources: List[Dict[str, Any]] = []
    context_chunks: List[str] = []

    for result in data:
        text = _extract_text_from_result(result)
        if not text:
            continue
        if len(text) > max_chars_per_result:
            text = text[:max_chars_per_result].rstrip() + "..."
        filename = (
            _get_attr(result, "filename", None)
            or _get_attr(result, "file_name", None)
            or _get_attr(result, "file_id", "unknown")
        )
        sources.append(
            {
                "file_id": _get_attr(result, "file_id", None),
                "filename": filename,
                "score": _get_attr(result, "score", None),
                "snippet": text,
            }
        )
        context_chunks.append(f"[{len(context_chunks) + 1}] {filename}\n{text}")

    context = ""
    if context_chunks:
        context = "Knowledge base sources:\n" + "\n\n".join(context_chunks)

    evidence = {
        "vector_store_id": vector_store_id,
        "query": query,
        "search_query": _get_attr(results, "search_query", None),
        "sources": sources,
    }
    return context, evidence


async def generate_chat_reply(
    *,
    messages_for_model: Sequence[Dict[str, Any]],
    model_name: str = "gpt-4o-mini",
    temperature: float = 0.2,
) -> str:
    """
    Plain text generation (non-structured).
    """
    msgs = _normalize_messages(messages_for_model)
    resp = client.chat.completions.create(
        model=model_name,
        messages=msgs,
        temperature=temperature,
    )
    return resp.choices[0].message.content or ""


async def generate_structured_text(
    *,
    messages_for_model: Sequence[Dict[str, Any]],
    response_model: Type[T],
    model_name: str = "gpt-4o-mini",
) -> T:
    """
    TRUE Structured Outputs:
    Uses OpenAI SDK structured parsing. Model is forced to match `response_model`.
    """
    msgs = _normalize_messages(messages_for_model)

    resp = client.responses.parse(
        model=model_name,
        input=msgs,
        text_format=response_model,
    )

    parsed = resp.output_parsed
    if parsed is None:
        # Covers refusal / incomplete cases.
        raise RuntimeError("No structured output parsed (refusal or incomplete response).")

    return parsed


# Backwards-compatible alias (your code was importing this name)
async def generate_structured_output(
    *,
    messages_for_model: Sequence[Dict[str, Any]],
    response_model: Type[T],
    model_name: str = "gpt-4o-mini",
) -> T:
    return await generate_structured_text(
        messages_for_model=messages_for_model,
        response_model=response_model,
        model_name=model_name,
    )
