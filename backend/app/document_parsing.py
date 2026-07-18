import re
import io

import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader

MAX_CHARS = 6000  # limite pra não estourar o contexto do modelo


def extract_resume_text(file_bytes: bytes, content_type: str) -> str:
    """Extrai texto de um currículo em PDF. Se vier .txt, lê direto."""
    if "pdf" in (content_type or ""):
        reader = PdfReader(io.BytesIO(file_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    else:
        text = file_bytes.decode("utf-8", errors="ignore")

    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text[:MAX_CHARS]


async def extract_job_description(url: str) -> str:
    """Baixa a página do link da vaga e extrai o texto visível principal."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; MockInterviewerBot/1.0; "
            "+https://mock-interviewer-backend-wxdn.onrender.com)"
        )
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    text = re.sub(r"\n{2,}", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    cleaned = "\n".join(lines)

    return cleaned[:MAX_CHARS]