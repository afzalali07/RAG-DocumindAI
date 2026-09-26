"""Local Ollama inference for the backend-configured Llama model."""
from collections.abc import AsyncIterator
import httpx
from app.config import get_settings
from app.llm.base import ChatMessage

settings = get_settings()

class OllamaProvider:
    provider = "ollama"

    def __init__(self, model: str = "llama3.2:3b") -> None:
        self.model = model

    def available(self) -> bool:
        """Reachable AND this specific model has been pulled."""
        try:
            r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=1.0)
            if r.status_code != 200:
                return False
            names = {m.get("name", "") for m in r.json().get("models", [])}
            if self.model == "llama3.1:8b":
                return bool(names & {"llama3.1:8b", "llama3.1:latest", "llama3.1"})
            # Ollama tags include an explicit ":latest"; match with or without it.
            return self.model in names or f"{self.model}:latest" in names
        except Exception:
            return False

    async def stream(
        self, system: str, messages: list[ChatMessage], lang: str = "ru"
    ) -> AsyncIterator[str]:
        try:
            async for token in self._stream(system, messages):
                yield token
        except httpx.TimeoutException as exc:
            raise RuntimeError("Ollama timed out while generating an answer. Please retry.") from exc
        except httpx.RequestError as exc:
            raise RuntimeError("Cannot connect to Ollama. Start Ollama and retry.") from exc

    async def _stream(self, system: str, messages: list[ChatMessage]) -> AsyncIterator[str]:
        import json

        payload = {
            "model": self.model,
            "stream": True,
            "messages": [{"role": "system", "content": system}]
            + [{"role": m.role, "content": m.content} for m in messages],
        }
        # Earlier installs used the equivalent default 8B tag.
        if self.model == "llama3.1:8b":
            async with httpx.AsyncClient(timeout=10) as client:
                try:
                    tags = await client.get(f"{settings.ollama_base_url}/api/tags")
                    tags.raise_for_status()
                    names = {item.get("name") for item in tags.json().get("models", [])}
                    if "llama3.1:8b" not in names and names & {"llama3.1:latest", "llama3.1"}:
                        payload["model"] = "llama3.1:latest"
                except httpx.RequestError as exc:
                    raise RuntimeError("Cannot connect to Ollama. Start Ollama and retry.") from exc
        if settings.ollama_num_gpu is not None:
            payload["options"] = {"num_gpu": settings.ollama_num_gpu}
        # Локальный Ollama медленный, но живой: длинный read-таймаут вместо None.
        timeout = httpx.Timeout(connect=10.0, read=600.0, write=60.0, pool=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST", f"{settings.ollama_base_url}/api/chat", json=payload
            ) as resp:
                if resp.status_code == 404:
                    raise RuntimeError(f"The configured model is not installed. Run: ollama pull {self.model}")
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    if data.get("error"):
                        raise RuntimeError(f"Ollama: {data['error']}")
                    token = data.get("message", {}).get("content")
                    if token:
                        yield token

