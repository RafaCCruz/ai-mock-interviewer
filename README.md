# AI Mock Interviewer

Plataforma de simulação de entrevistas de emprego com feedback em tempo real gerado por IA. O candidato responde por voz, recebe avaliação e a próxima pergunta na sequência — tudo personalizado com base na vaga (link) e no currículo enviado.

**Live demo:** [ai-mock-interviewer-teal.vercel.app](https://ai-mock-interviewer-teal.vercel.app)

---

## ✨ Funcionalidades

- **Autenticação de usuários** — cadastro e login com e-mail/senha (JWT), histórico isolado por conta.
- **Entrevista por voz** — grave a resposta pelo microfone; transcrição automática via Whisper.
- **Personalização por vaga e currículo** — cole o link da vaga (a descrição é extraída automaticamente) e envie seu currículo em PDF; a IA usa os dois para gerar perguntas e feedback específicos, para qualquer área (tecnologia, vendas, saúde, educação, etc.).
- **Feedback com voz** — a próxima pergunta é sintetizada em áudio (text-to-speech) e tocada automaticamente.
- **Sugestões de melhoria no currículo** — ao final, a IA compara o currículo com a vaga e aponta ajustes concretos (palavras-chave ausentes, experiências a destacar, pontos de clareza).
- **Histórico de entrevistas** — cada resposta, feedback e pergunta ficam salvos e disponíveis por conta.

---

## 🛠️ Stack

| Camada       | Tecnologia                                              |
|--------------|----------------------------------------------------------|
| Frontend     | Next.js (App Router), React, TypeScript, Tailwind CSS    |
| Backend      | FastAPI (Python)                                          |
| Banco        | PostgreSQL + SQLAlchemy + Alembic (migrações)             |
| IA / NLP     | Groq API — Whisper (transcrição) e Llama 3.3 (análise)    |
| Voz          | edge-tts (text-to-speech)                                  |
| Autenticação | JWT (PyJWT) + bcrypt (passlib)                             |
| Extração     | pypdf (currículo) e BeautifulSoup (descrição da vaga)      |
| Hospedagem   | Vercel (frontend) + Render (backend e banco)                |

---

## 🏗️ Arquitetura

```
frontend/                    Next.js — UI, autenticação client-side, gravação de áudio
  src/
    app/
      page.tsx                Landing pública + fluxo da entrevista (logado)
      login/page.tsx          Login e criação de conta
      historico/page.tsx      Histórico de entrevistas do usuário
    context/AuthContext.tsx   Estado de autenticação (token JWT em localStorage)
    hooks/useAudioRecorder.ts Gravação de áudio via MediaRecorder API

backend/                     FastAPI — API REST
  app/
    main.py                  Rotas (auth, entrevista, currículo, áudio)
    auth.py                  Hash de senha, criação/validação de JWT
    document_parsing.py      Extração de texto de PDF e de páginas de vaga
    models.py                Modelos SQLAlchemy (User, InterviewSession, InterviewTurn)
    database.py              Conexão com PostgreSQL
  alembic/                   Migrações de banco de dados
```

### Fluxo de uma entrevista

1. O usuário faz login (recebe um token JWT).
2. `POST /api/interview/start` — cria uma `InterviewSession` com a vaga, o link (descrição extraída automaticamente) e o currículo (texto extraído do PDF); a IA gera a primeira pergunta com base nesse contexto.
3. Para cada resposta gravada: `POST /api/audio/transcribe` → `POST /api/interview/analyze` (feedback + próxima pergunta, usando o contexto da sessão) → `POST /api/audio/tts` (áudio da próxima pergunta).
4. `POST /api/resume/suggestions` — gera sugestões de melhoria do currículo com base na vaga, sob demanda.
5. `GET /api/interview/history` — lista os turnos do usuário logado.

---

## 📋 Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Python 3.11+
- PostgreSQL (local ou um banco gerenciado, ex: Render)
- Conta na [Groq](https://console.groq.com/) para a API key

### 1. Clonar o repositório

```bash
git clone https://github.com/RafaCCruz/ai-mock-interviewer.git
cd ai-mock-interviewer
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # macOS/Linux

pip install -r requirements.txt
```

Crie um arquivo `.env` em `backend/` com:

```env
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
GROQ_API_KEY=sua_chave_groq
JWT_SECRET=uma_string_aleatoria_bem_longa
FRONTEND_ORIGINS=http://localhost:3000
```

Rode as migrações e suba o servidor:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

A API sobe em `http://localhost:8000` (docs interativas em `/docs`).

### 3. Frontend

```bash
cd ../frontend
npm install
```

Crie um arquivo `.env.local` em `frontend/` com:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Acesse `http://localhost:3000`.

---

## 🚀 Deploy

- **Frontend**: deploy automático na Vercel a cada push na branch principal. Variável de ambiente necessária: `NEXT_PUBLIC_API_URL` apontando para a URL do backend em produção.
- **Backend**: deploy automático no Render. Variáveis de ambiente necessárias: `DATABASE_URL`, `GROQ_API_KEY`, `JWT_SECRET`, `FRONTEND_ORIGINS` (URL do frontend na Vercel).
- **Banco**: PostgreSQL gerenciado pelo Render. Após qualquer alteração de schema, rodar `alembic upgrade head` apontando para a `DATABASE_URL` de produção.

---

## 🔐 Notas de segurança

- Senhas nunca são armazenadas em texto plano — usa hash bcrypt.
- Autenticação via JWT com expiração de 7 dias.
- CORS restrito às origens definidas em `FRONTEND_ORIGINS` (não usa `*` em produção, já que as requisições carregam credenciais).
- Histórico e sessões de entrevista são sempre filtrados pelo `user_id` do token — um usuário nunca acessa dados de outro.

---

## 🗺️ Roadmap / próximos passos

- [ ] Recuperação de senha por e-mail
- [ ] Suporte a currículo em `.docx`
- [ ] Limite de duração da gravação de áudio
- [ ] Migrar parsing de resposta da IA (`feedback | pergunta`) para structured output (JSON)
- [ ] Testes automatizados (backend e frontend)

---

## 🤝 Contribuição

Contribuições são bem-vindas! Abra uma *issue* ou envie um *pull request*.

## 📄 Licença

Este projeto está disponível sob a licença MIT.
