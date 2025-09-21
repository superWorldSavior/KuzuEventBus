from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256

from src.domain.shared.value_objects import ValidationError


def _normalize_query_text(raw: str) -> str:
    # Trim and collapse internal whitespace to a canonical form
    # This helps to avoid duplicates differing only by spacing
    return " ".join(raw.strip().split())


@dataclass(frozen=True)
class QueryText:
    value: str

    def __post_init__(self) -> None:
        normalized = _normalize_query_text(self.value)
        if not normalized:
            raise ValidationError("Query text cannot be empty")
        if len(normalized) > 10_000:
            raise ValidationError("Query text exceeds maximum length of 10000 characters")
        # store normalized
        object.__setattr__(self, "value", normalized)

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.value


@dataclass(frozen=True)
class QueryHash:
    value: str

    def __post_init__(self) -> None:
        v = self.value.strip().lower()
        if not v:
            raise ValidationError("Query hash cannot be empty")
        # very small guard — we expect hex slice of sha256
        if any(c not in "0123456789abcdef" for c in v):
            raise ValidationError("Query hash must be lowercase hex")
        if len(v) < 12:  # allow different truncation sizes, but avoid too short
            raise ValidationError("Query hash too short")
        object.__setattr__(self, "value", v)

    @classmethod
    def from_query_text(cls, text: QueryText, length: int = 16) -> "QueryHash":
        if length < 12 or length > 64:
            raise ValidationError("Hash length must be between 12 and 64")
        digest = sha256(text.value.encode("utf-8")).hexdigest()[:length]
        return cls(digest)
