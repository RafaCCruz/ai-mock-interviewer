# 🎙️ AI Mock Interviewer

<p align="center">
  <strong>Simulador de entrevistas técnicas com feedback em tempo real, powered by IA.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.139-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/PostgreSQL-database-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Groq-Whisper%20%7C%20Llama%203.3-orange" alt="Groq" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## 📖 Sobre o projeto

O **AI Mock Interviewer** é uma plataforma full-stack que simula entrevistas técnicas de emprego usando IA. O candidato responde perguntas **falando no microfone**, e a aplicação:

1. Transcreve o áudio automaticamente (Speech-to-Text);
2. Analisa a resposta com um modelo de linguagem, gerando feedback construtivo;
3. Gera a próxima pergunta da entrevista, adaptada à vaga escolhida;
4. Converte a pergunta em áudio (Text-to-Speech) para uma experiência conversacional;
5. Salva cada turno da entrevista em banco de dados, com histórico consultável.

O resultado é uma experiência de entrevista simulada, fluida e por voz — pensada para ajudar desenvolvedores a treinarem para processos seletivos reais.

---

## ✨ Funcionalidades

- 🎤 **Entrevista por voz** — grave sua resposta direto do navegador (Web Audio API / `MediaRecorder`).
- 📝 **Transcrição automática** via **Whisper Large v3** (Groq).
- 🧠 **Feedback com IA** gerado por **Llama 3.3 70B**, atuando como um recrutador técnico sênior.
- ❓ **Perguntas dinâmicas** — cada resposta gera a próxima pergunta, adaptada à vaga informada.
- 🔊 **Voz da IA** — as perguntas são narradas em português (pt-BR) via **Edge TTS**.
- 🗂️ **Histórico de entrevistas** — todas as interações são persistidas em PostgreSQL e podem ser revisitadas.
- ⚡ **API assíncrona** construída com FastAPI + SQLAlchemy + Alembic (migrations).

---

## 🏗️ Arquitetura

```
ai-mock-interviewer/
├── backend/                # API em FastAPI
│   ├── app/
│   │   ├── main.py         # Rotas: transcrição, análise, TTS, histórico
│   │   ├── models.py       # Modelo SQLAlchemy (InterviewTurn)
│   │   └── database.py     # Conexão e sessão com PostgreSQL
│   ├── alembic/             # Migrations do banco de dados
│   └── requirements.txt
│
└── frontend/                # Aplicação em Next.js
    ├── src/app/
    │   ├── page.tsx          # Tela principal da entrevista
    │   └── historico/        # Tela de histórico
    ├── src/hooks/
    │   └── useAudioRecorder.ts  # Hook de gravação de áudio
    └── package.json
```

### Fluxo da entrevista

```
Usuário grava resposta (mic)
        │
        ▼
POST /api/audio/transcribe   →  Whisper (Groq)  →  texto transcrito
        │
        ▼
POST /api/interview/analyze  →  Llama 3.3 (Groq) →  feedback + próxima pergunta
        │                                              │
        │                                              ▼
        │                                    salvo no PostgreSQL
        ▼
POST /api/audio/tts          →  Edge TTS  →  áudio da próxima pergunta
```

---

## 🛠️ Tecnologias

| Camada          | Tecnologias                                                              |
|------------------|---------------------------------------------------------------------------|
| **Frontend**     | Next.js 16, React 19, TypeScript, Tailwind CSS 4                          |
| **Backend**      | FastAPI, Uvicorn, Pydantic                                                 |
| **IA / NLP**     | Groq API — Whisper Large v3 (STT) e Llama 3.3 70B (análise/feedback)      |
| **Text-to-Speech** | Edge TTS (voz `pt-BR-FranciscaNeural`)                                   |
| **Banco de dados** | PostgreSQL + SQLAlchemy + Alembic (migrations)                          |
| **Deploy**       | Vercel (frontend) e Render (backend)                                      |

---

## 🚀 Como rodar o projeto localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Python](https://www.python.org/) 3.9+
- PostgreSQL rodando localmente ou em nuvem (ex: [Neon](https://neon.tech/), [Render](https://render.com/))
- Uma [chave de API da Groq](https://console.groq.com/keys)

### 1. Clonar o repositório

```bash
git clone https://github.com/RafaCCruz/ai-mock-interviewer.git
cd ai-mock-interviewer
```

### 2. Configurar o Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

Crie um arquivo `.env` dentro de `backend/` com:

```env
GROQ_API_KEY=sua_chave_groq
DATABASE_URL=postgresql://usuario:senha@host:porta/nome_do_banco
```

Rode as migrations do banco:

```bash
alembic upgrade head
```

Inicie a API:

```bash
uvicorn app.main:app --reload
```

A API sobe por padrão em `http://localhost:8000`.

### 3. Configurar o Frontend

```bash
cd ../frontend
npm install
```

> ⚠️ Atualmente as chamadas à API estão apontando para a URL de produção no Render (`https://mock-interviewer-backend-wxdn.onrender.com`). Para rodar o backend localmente, atualize as URLs em `src/app/page.tsx` para `http://localhost:8000` ou configure-as via variável de ambiente.

```bash
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

---

## 📡 Endpoints da API

| Método | Rota                        | Descrição                                                   |
|--------|-----------------------------|----------------------------------------------------------------|
| `POST` | `/api/audio/transcribe`     | Recebe um arquivo de áudio e retorna a transcrição em texto.   |
| `POST` | `/api/interview/analyze`    | Recebe a transcrição e a vaga, retorna feedback + próxima pergunta. |
| `POST` | `/api/audio/tts`            | Converte um texto em áudio (mp3) narrado por voz sintética.    |
| `GET`  | `/api/interview/history`    | Retorna o histórico de turnos de entrevista salvos no banco.   |

---

## 📈 Deploy

O projeto está preparado para deploy contínuo:

- **Frontend:** deploy automático na [Vercel](https://vercel.com/), conectado ao GitHub.
- **Backend:** deploy configurado no [Render](https://render.com/).

---

## 🗺️ Roadmap / Possíveis melhorias

- [ ] Autenticação de usuários (histórico por conta)
- [ ] Suporte a múltiplos idiomas
- [ ] Avaliação de sentimento/tom de voz na resposta
- [ ] Relatório final de desempenho ao fim da entrevista
- [ ] Testes automatizados (backend e frontend)

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas!

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

Sinta-se à vontade também para abrir uma [Issue](../../issues) relatando bugs ou sugerindo melhorias.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

<p align="center">Feito com 💙 por <a href="https://github.com/RafaCCruz">RafaCCruz</a></p>
