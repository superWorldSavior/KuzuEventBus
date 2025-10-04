"""Unit tests for branching value objects."""
import pytest

from src.domain.branching import BranchName


def test_branch_name_valid():
    """Valid branch names should be accepted."""
    name = BranchName("test-migration")
    assert name.value == "test-migration"


def test_branch_name_with_underscores():
    """Branch names can contain underscores."""
    name = BranchName("alice_feature_123")
    assert name.value == "alice_feature_123"


def test_branch_name_alphanumeric():
    """Branch names with alphanumeric characters are valid."""
    name = BranchName("feature123")
    assert name.value == "feature123"


def test_branch_name_too_short():
    """Branch names must be at least 2 characters."""
    with pytest.raises(ValueError, match="at least 2 characters"):
        BranchName("a")


def test_branch_name_too_long():
    """Branch names cannot exceed 50 characters."""
    with pytest.raises(ValueError, match="cannot exceed 50 characters"):
        BranchName("a" * 51)


def test_branch_name_empty():
    """Empty branch names are not allowed."""
    with pytest.raises(ValueError, match="cannot be empty"):
        BranchName("")


def test_branch_name_invalid_characters():
    """Branch names can only contain alphanumeric, hyphens, and underscores."""
    with pytest.raises(ValueError, match="can only contain"):
        BranchName("test@branch")
    
    with pytest.raises(ValueError, match="can only contain"):
        BranchName("test.branch")
    
    with pytest.raises(ValueError, match="can only contain"):
        BranchName("test branch")


def test_branch_name_cannot_start_with_hyphen():
    """Branch names cannot start with hyphen."""
    with pytest.raises(ValueError, match="cannot start with hyphen"):
        BranchName("-test")


def test_branch_name_cannot_start_with_underscore():
    """Branch names cannot start with underscore."""
    with pytest.raises(ValueError, match="cannot start with.*underscore"):
        BranchName("_test")


def test_branch_name_to_full_name():
    """Should generate full database name with branch prefix."""
    name = BranchName("test-migration")
    full = name.to_full_name("prod-db")
    
    assert full == "prod-db--branch--test-migration"


def test_branch_name_from_full_name_valid():
    """Should parse valid branch name."""
    result = BranchName.from_full_name("prod-db--branch--alice-test")
    
    assert result is not None
    parent, branch = result
    assert parent == "prod-db"
    assert branch.value == "alice-test"


def test_branch_name_from_full_name_not_a_branch():
    """Should return None for non-branch names."""
    result = BranchName.from_full_name("regular-database")
    assert result is None


def test_branch_name_from_full_name_invalid_format():
    """Should handle invalid branch format gracefully."""
    # Empty branch name part should raise ValueError when trying to create BranchName
    # The from_full_name will try to create BranchName("") which raises ValueError
    try:
        result = BranchName.from_full_name("db--branch--")
        # If it returns None, that's also acceptable
        assert result is None
    except ValueError:
        # This is expected for empty branch names
        pass
