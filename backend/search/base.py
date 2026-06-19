"""Abstract base class for search providers."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    published_date: Optional[str] = None
    source_domain: Optional[str] = None


class SearchProvider(ABC):
    """Interface that all search providers must implement."""

    @abstractmethod
    async def search(
        self,
        query: str,
        max_results: int = 10,
        site_filter: Optional[str] = None,
    ) -> list[SearchResult]:
        """Execute a web search and return structured results."""
        ...

    @abstractmethod
    async def fetch_url(self, url: str) -> str:
        """Fetch and return the text content of a URL."""
        ...
