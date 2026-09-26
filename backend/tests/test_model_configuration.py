import asyncio
import json

import httpx
import pytest
from pydantic import ValidationError

from app.config import Settings
from app.llm import registry, providers


@pytest.mark.parametrize('model', ['llama3.2:3b', 'llama3.1:8b'])
def test_backend_model_is_authoritative(model, monkeypatch):
    settings = Settings(_env_file=None, ollama_model=model)
    monkeypatch.setattr(registry, 'get_settings', lambda: settings)
    for supplied in [None, 'mock', 'openai:gpt-4o', 'ollama:mistral', 'ollama:llama3.1:8b']:
        provider = registry.get_provider(supplied)
        assert provider.provider == 'ollama'
        assert provider.model == model


@pytest.mark.parametrize('model', ['mock', 'mistral', 'gpt-4o', 'llama3.1:70b', ''])
def test_invalid_model_configuration_fails(model):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ollama_model=model)


def test_requests_cannot_override_model_in_history(client, monkeypatch):
    from app.api.routes import chat
    from fake_provider import MockProvider
    configured = registry.configured_model_id()
    def get_provider(model):
        assert model == configured
        return MockProvider()
    monkeypatch.setattr(chat, 'get_provider', get_provider)
    monkeypatch.setattr(chat.rag, 'retrieve', lambda **kwargs: [])
    response = client.post('/api/chat', json={'message': 'Hello', 'model': 'openai:gpt-4o'})
    assert response.status_code == 200
    frames = [json.loads(frame.splitlines()[1][6:]) for frame in response.text.split('\n\n') if frame.startswith('event: done')]
    history = client.get('/api/conversations/' + frames[0]['conversation_id']).json()
    assert history['model'] == configured


@pytest.mark.parametrize('failure', ['missing', 'connection', 'stream_error'])
def test_ollama_errors_are_explicit(failure, monkeypatch):
    original_client = httpx.AsyncClient
    def handler(request):
        if failure == 'connection':
            raise httpx.ConnectError('offline', request=request)
        if failure == 'missing':
            return httpx.Response(404, json={'error': 'model not found'})
        return httpx.Response(200, content='{"error":"out of memory"}\n')
    monkeypatch.setattr(providers.httpx, 'AsyncClient', lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs))
    async def collect():
        return [text async for text in providers.OllamaProvider('llama3.2:3b').stream('test', [])]
    expected = {'missing': 'ollama pull llama3.2:3b', 'connection': 'Start Ollama', 'stream_error': 'out of memory'}
    with pytest.raises(RuntimeError, match=expected[failure]):
        asyncio.run(collect())


def test_existing_llama31_default_tag_is_supported(monkeypatch):
    original_client = httpx.AsyncClient
    def handler(request):
        if request.url.path == '/api/tags':
            return httpx.Response(200, json={'models': [{'name': 'llama3.1:latest'}]})
        assert json.loads(request.content)['model'] == 'llama3.1:latest'
        return httpx.Response(200, content='{"message":{"content":"Hello"}}\n')
    monkeypatch.setattr(providers.httpx, 'AsyncClient', lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs))
    async def collect():
        return [text async for text in providers.OllamaProvider('llama3.1:8b').stream('test', [])]
    assert asyncio.run(collect()) == ['Hello']
