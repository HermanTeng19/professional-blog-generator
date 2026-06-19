"""Search provider factory — resolves provider name to implementation."""
from typing import Optional

from config import settings
from search.base import SearchProvider


def get_search_provider(name: Optional[str] = None) -> SearchProvider:
    """Return the configured search provider instance.

    Args:
        name: Provider name override. If None, uses settings.search_provider.
              Valid: "brave", "tavily"
    """
    provider_name = (name or settings.search_provider).lower()

    if provider_name == "brave":
        from search.brave_provider import BraveSearchProvider
        return BraveSearchProvider()
    elif provider_name == "tavily":
        from search.tavily_provider import TavilySearchProvider
        return TavilySearchProvider()
    else:
        raise ValueError(
            f"Unknown search provider: {provider_name}. "
            f"Valid options: brave, tavily"
        )
