"""Abstract base class for LLM providers."""
from abc import ABC, abstractmethod
from typing import Callable, Awaitable, Optional


class LLMProvider(ABC):
    """Interface that all LLM providers must implement."""

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        stream_callback: Optional[Callable[[str], Awaitable[None]]] = None,
    ) -> str:
        """Generate a completion. If stream_callback is provided, call it with each
        incremental text chunk. Returns the full response text."""
        ...
