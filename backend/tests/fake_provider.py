import asyncio
import re
from collections.abc import AsyncIterator
from app.llm.base import ChatMessage

class MockProvider:
    """Deterministic offline provider — grounds its answer in retrieved context
    so the RAG flow (and citations) can be demoed without any API key."""

    provider = "mock"

    def __init__(self, model: str = "mock") -> None:
        self.model = model

    def available(self) -> bool:
        return True

    async def stream(
        self, system: str, messages: list[ChatMessage], lang: str = "ru"
    ) -> AsyncIterator[str]:
        question = messages[-1].content if messages else ""
        # Pull the context block the RAG pipeline injected into `system`.
        context = ""
        if "CONTEXT:" in system:
            context = system.split("CONTEXT:", 1)[1].strip()

        first = context.splitlines()[0] if context.splitlines() else ""
        if lang == "en":
            if context:
                reply = (
                    f"Based on your uploaded documents, regarding “{question}”:\n\n"
                    f"{first[:600]}\n\n"
                    "See the sources below for details. "
                    "(Demo mode: connect OpenAI/Anthropic/Ollama for real answers.)"
                )
            else:
                reply = (
                    f"You asked: “{question}”. I couldn't find relevant fragments in the "
                    "uploaded documents. Upload documents or refine your question.\n\n"
                    "(Demo mode, no external model.)"
                )
        else:
            if context:
                reply = (
                    f"На основе загруженных документов по вашему вопросу «{question}»:\n\n"
                    f"{first[:600]}\n\n"
                    "Подробности приведены в источниках ниже. "
                    "(Демо-режим: подключите OpenAI/Anthropic/Ollama для реальных ответов.)"
                )
            else:
                reply = (
                    f"Вы спросили: «{question}». Я не нашёл релевантных фрагментов в "
                    "загруженных документах. Загрузите документы или уточните вопрос.\n\n"
                    "(Демо-режим без внешней модели.)"
                )

        for token in _tokenize(reply):
            await asyncio.sleep(0.012)
            yield token



def _tokenize(text):
    return re.findall(r"\S+\s*", text) or [text]
