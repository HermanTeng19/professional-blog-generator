"""Tavily Search API provider."""
from typing import Optional

import httpx

from config import settings
from search.base import SearchProvider, SearchResult


class TavilySearchProvider(SearchProvider):
    BASE_URL = "https://api.tavily.com/search"

    def __init__(self):
        self.api_key = settings.tavily_api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search(
        self,
        query: str,
        max_results: int = 10,
        site_filter: Optional[str] = None,
    ) -> list[SearchResult]:
        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "advanced",
        }
        if site_filter:
            payload["include_domains"] = [site_filter]

        response = await self.client.post(self.BASE_URL, json=payload)
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("results", []):
            results.append(SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                snippet=item.get("content", ""),
                published_date=None,
                source_domain=None,
            ))
        return results[:max_results]

    async def fetch_url(self, url: str) -> str:
        response = await self.client.get(url, follow_redirects=True)
        response.raise_for_status()
        return response.text
