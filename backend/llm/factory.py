"""LLM provider factory — resolves provider name to implementation."""
from typing import Optional

from config import settings
from llm.base import LLMProvider


def get_llm_provider(name: Optional[str] = None) -> LLMProvider:
    """Return the configured LLM provider instance.

    Args:
        name: Provider name override. If None, uses settings.llm_provider.
              Valid: "claude", "openai", "deepseek", "kimi"
    """
    provider_name = (name or settings.llm_provider).lower()

    if provider_name == "claude":
        from llm.claude_provider import ClaudeProvider
        return ClaudeProvider()
    elif provider_name == "openai":
        from llm.openai_provider import OpenAIProvider
        return OpenAIProvider()
    elif provider_name == "deepseek":
        from llm.deepseek_provider import DeepSeekProvider
        return DeepSeekProvider()
    elif provider_name == "kimi":
        from llm.kimi_provider import KimiProvider
        return KimiProvider()
    elif provider_name == "openrouter":
        from llm.openrouter_provider import OpenRouterProvider
        return OpenRouterProvider()
    elif provider_name == "siliconflow":
        from llm.siliconflow_provider import SiliconFlowProvider
        return SiliconFlowProvider()
    else:
        raise ValueError(
            f"Unknown LLM provider: {provider_name}. "
            f"Valid options: claude, openai, deepseek, kimi, openrouter, siliconflow"
        )
