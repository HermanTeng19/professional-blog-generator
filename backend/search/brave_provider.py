"""Brave Search API provider."""
from typing import Optional

import httpx

from config import settings
from search.base import SearchProvider, SearchResult


class BraveSearchProvider(SearchProvider):
    BASE_URL = "https://api.search.brave.com/res/v1/web/search"

    def __init__(self):
        self.api_key = settings.brave_api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search(
        self,
        query: str,
        max_results: int = 10,
        site_filter: Optional[str] = None,
    ) -> list[SearchResult]:
        full_query = f"{query} site:{site_filter}" if site_filter else query
        response = await self.client.get(
            self.BASE_URL,
            params={"q": full_query, "count": max_results},
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": self.api_key,
            },
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("web", {}).get("results", []):
            results.append(SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                snippet=item.get("description", ""),
                published_date=item.get("age"),
                source_domain=item.get("profile", {}).get("name"),
            ))
        return results[:max_results]

    async def fetch_url(self, url: str) -> str:
        response = await self.client.get(url, follow_redirects=True)
        response.raise_for_status()
        return response.text
