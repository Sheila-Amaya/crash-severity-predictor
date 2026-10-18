from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DB_URL: str

    # Orígenes permitidos por CORS, separados por coma.
    # Ejemplo: http://localhost:5173,https://mi-frontend.com
    CORS_ORIGINS: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        # "*" se descarta: los orígenes deben declararse explícitamente.
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip() and origin.strip() != "*"
        ]


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()