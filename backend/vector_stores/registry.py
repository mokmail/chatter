"""Registry for vector store backends.

Usage:
    from vector_stores import get_vector_store

    store = get_vector_store("chroma")  # returns ChromaAdapter
    store = get_vector_store("qdrant")  # returns QdrantAdapter
"""
from vector_stores.base import VectorStoreBase

_backends: dict[str, type[VectorStoreBase]] = {}


def register_backend(name: str, cls: type[VectorStoreBase]) -> None:
    """Register a vector store backend class under a given name."""
    if not issubclass(cls, VectorStoreBase):
        raise TypeError(f"{cls} is not a subclass of VectorStoreBase")
    _backends[name] = cls


def get_vector_store(backend: str = "chroma", **kwargs) -> VectorStoreBase:
    """Instantiate a vector store backend by name.

    Args:
        backend: Backend name (e.g., "chroma", "qdrant").
        **kwargs: Additional arguments passed to the backend constructor.

    Returns:
        An instance of the requested VectorStoreBase subclass.

    Raises:
        ValueError: If the backend name is not registered.
    """
    cls = _backends.get(backend)
    if cls is None:
        available = ", ".join(_backends.keys()) if _backends else "none registered"
        raise ValueError(f"Unknown vector store backend: '{backend}'. Available: {available}")
    return cls(**kwargs)


def list_backends() -> list[str]:
    """Return names of all registered backends."""
    return list(_backends.keys())