"""Application configuration via environment variables."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM
    llm_provider: str = "claude"  # claude | openai | deepseek | kimi | openrouter | siliconflow
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    kimi_api_key: str = ""
    kimi_base_url: str = "https://api.moonshot.cn/v1"
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "anthropic/claude-sonnet-4-6"
    siliconflow_api_key: str = ""
    siliconflow_base_url: str = "https://api.siliconflow.cn/v1"
    siliconflow_model: str = "deepseek-ai/DeepSeek-V3"

    # Search
    search_provider: str = "brave"  # brave | tavily
    brave_api_key: str = ""
    tavily_api_key: str = ""

    # Output
    output_base_path: str = str(
        Path.home() / "Documents/Projects/2026/6_Jun/Blog-writing"
    )

    # Redis
    redis_url: str = "redis://localhost:6379"

    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    cors_origin: str = "http://localhost:3000"


settings = Settings()
