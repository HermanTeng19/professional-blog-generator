"""Kimi K2 provider implementation (OpenAI-compatible API via Moonshot)."""
from typing import Callable, Awaitable, Optional

from openai import AsyncOpenAI

from config import settings
from llm.base import LLMProvider


class KimiProvider(LLMProvider):
    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.kimi_api_key,
            base_url=settings.kimi_base_url,
        )

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
            stream = await self.client.chat.completions.create(
                model="kimi-k2",
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    full_text += text
                    await stream_callback(text)
            return full_text
        else:
            response = await self.client.chat.completions.create(
                model="kimi-k2",
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return response.choices[0].message.content
