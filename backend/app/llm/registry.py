"""Only two supported Llama models; selection belongs to backend configuration."""
from app.config import get_settings
from app.llm.providers import OllamaProvider

MODELS = {
    'llama3.2:3b': 'Llama 3.2 3B',
    'llama3.1:8b': 'Llama 3.1 8B',
}


def configured_model_id() -> str:
    return f'ollama:{get_settings().ollama_model}'


def list_models() -> list[dict]:
    return [
        {'id': f'ollama:{name}', 'provider': 'ollama', 'label': label,
         'available': OllamaProvider(name).available(),
         'description': 'Configured in backend/.env' if name == get_settings().ollama_model else 'Alternative backend model'}
        for name, label in MODELS.items()
    ]


def get_provider(_requested_model: str | None = None) -> OllamaProvider:
    # Legacy client model values are ignored; they cannot override the server.
    return OllamaProvider(get_settings().ollama_model)
