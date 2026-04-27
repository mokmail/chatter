import tempfile
from pathlib import Path
from typing import List

from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)
from langchain_core.documents import Document

def load_file_content(file_path: str, file_type: str = None) -> str:
    """Load content from various file types using LangChain loaders."""
    path = Path(file_path)
    if not file_type:
        file_type = path.suffix.lower().lstrip('.')

    try:
        loader = None
        if file_type == 'pdf':
            loader = PyPDFLoader(file_path)
        elif file_type in ['doc', 'docx']:
            loader = Docx2txtLoader(file_path)
        elif file_type == 'md':
            try:
                loader = UnstructuredMarkdownLoader(file_path)
            except Exception:
                loader = TextLoader(file_path, encoding='utf-8')
        else:
            # Default to text loader
            try:
                loader = TextLoader(file_path, encoding='utf-8')
            except Exception:
                # Fallback for other encodings
                loader = TextLoader(file_path)

        if loader:
            docs = loader.load()
            return "\n\n".join([doc.page_content for doc in docs])
    except Exception as e:
        print(f"Error loading file {file_path}: {e}")
        # Final fallback to raw text reading if loader fails
        try:
            return path.read_text(errors='ignore')
        except Exception:
            return ""
    
    return ""

def process_upload(file_bytes: bytes, filename: str) -> str:
    """Process an uploaded file by saving it to a temp file and loading it."""
    suffix = Path(filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        content = load_file_content(tmp_path)
        return content
    finally:
        Path(tmp_path).unlink()
