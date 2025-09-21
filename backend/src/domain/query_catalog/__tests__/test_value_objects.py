from __future__ import annotations

import pytest

from src.domain.query_catalog.value_objects import QueryText, QueryHash
from src.domain.shared.value_objects import ValidationError


class TestQueryText:
    def test_normalization_and_length(self) -> None:
        qt = QueryText("  MATCH   (n)   RETURN   n  ")
        assert qt.value == "MATCH (n) RETURN n"
        assert len(qt.value) > 0

    def test_empty_is_invalid(self) -> None:
        with pytest.raises(ValidationError):
            QueryText("   \n\t  ")

    def test_too_long_is_invalid(self) -> None:
        with pytest.raises(ValidationError):
            QueryText("x" * 10001)


class TestQueryHash:
    def test_from_query_text_default_length(self) -> None:
        qt = QueryText("RETURN 1 AS x")
        h = QueryHash.from_query_text(qt)  # default 16
        assert len(h.value) == 16
        # hex lowercase
        assert h.value == h.value.lower()
        int(h.value, 16)  # parseable hex

    def test_length_constraints(self) -> None:
        qt = QueryText("RETURN 1 AS x")
        with pytest.raises(ValidationError):
            QueryHash.from_query_text(qt, length=8)
        with pytest.raises(ValidationError):
            QueryHash.from_query_text(qt, length=100)

    def test_construct_validation(self) -> None:
        with pytest.raises(ValidationError):
            QueryHash("")
        with pytest.raises(ValidationError):
            QueryHash("not-hex-zzz")
        with pytest.raises(ValidationError):
            QueryHash("abc")  # too short
