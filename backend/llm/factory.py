"""LLM provider factory — resolves provider name to implementation."""
from typing import Optional

from config import settings
from llm.base import LLMProvider
from models.schemas import LLMConfig


def get_llm_provider(
    name: Optional[str] = None,
    llm_config: Optional[LLMConfig] = None,
) -> LLMProvider:
    """Return the configured LLM provider instance.

    Args:
        name: Provider name override. If None, uses settings.llm_provider.
              Valid: "claude", "openai", "deepseek", "kimi", "openrouter", "siliconflow"
        llm_config: Per-request BYOK config. When provided, takes full precedence
                    over both name and global settings for credentials/model.

    Fallback chain:
        1. llm_config (if provided) → provider from llm_config.provider
        2. name parameter → provider from name
        3. settings.llm_provider → global default
    """
    if llm_config:
        provider_name = llm_config.provider.lower()
        api_key = llm_config.api_key
        base_url = llm_config.base_url
        model = llm_config.model
    else:
        provider_name = (name or settings.llm_provider).lower()
        api_key = None
        base_url = None
        model = None

    valid = {"claude", "openai", "deepseek", "kimi", "openrouter", "siliconflow"}
    if provider_name not in valid:
        raise ValueError(
            f"Unknown LLM provider: {provider_name}. "
            f"Valid options: {', '.join(sorted(valid))}"
        )

    if provider_name == "claude":
        from llm.claude_provider import ClaudeProvider
        return ClaudeProvider(api_key=api_key, base_url=base_url, model=model)
    elif provider_name == "openai":
        from llm.openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=api_key, base_url=base_url, model=model)
    elif provider_name == "deepseek":
        from llm.deepseek_provider import DeepSeekProvider
        return DeepSeekProvider(api_key=api_key, base_url=base_url, model=model)
    elif provider_name == "kimi":
        from llm.kimi_provider import KimiProvider
        return KimiProvider(api_key=api_key, base_url=base_url, model=model)
    elif provider_name == "openrouter":
        from llm.openrouter_provider import OpenRouterProvider
        return OpenRouterProvider(api_key=api_key, base_url=base_url, model=model)
    elif provider_name == "siliconflow":
        from llm.siliconflow_provider import SiliconFlowProvider
        return SiliconFlowProvider(api_key=api_key, base_url=base_url, model=model)
