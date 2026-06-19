"""Anthropic Claude provider implementation."""
from typing import Callable, Awaitable, Optional

from anthropic import AsyncAnthropic

from config import settings
from llm.base import LLMProvider


class ClaudeProvider(LLMProvider):
    def __init__(self) -> None:
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        stream_callback: Optional[Callable[[str], Awaitable[None]]] = None,
    ) -> str:
        if stream_callback:
            full_text = ""
            async with self.client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                async for event in stream:
                    if event.type == "text":
                        full_text += event.text
                        await stream_callback(event.text)
            return full_text
        else:
            response = await self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return response.content[0].text
