AI Mock Interviewer
Uma plataforma inteligente projetada para ajudar desenvolvedores a praticarem entrevistas
técnicas com feedback em tempo real utilizando Inteligência Artificial.
Este projeto combina um frontend moderno construído com Next.js e um backend robusto em
FastAPI, permitindo uma experiência de entrevista simulada fluida e interativa.

🚀 Funcionalidades
● Simulação de Entrevistas: Pratique para vagas específicas de desenvolvimento.
● Interface de Voz: Responda às perguntas utilizando o microfone.
● Processamento via IA: Transcrição e análise das respostas em tempo real.
● Histórico: Acompanhe seu progresso e revise entrevistas anteriores.

️ Tecnologias Utilizadas
Componente Tecnologia
Frontend Next.js, Tailwind CSS
Backend FastAPI, Python
IA/NLP OpenAI API (ou modelo equivalente)
Hospedagem Vercel (Frontend), Render (Backend)
📋 Como Rodar o Projeto
Pré-requisitos
● Node.js (versão 18+)
● Python (versão 3.9+)
● Git instalado
Passo 1: Clonar o Repositório
git clone https://github.com/SEU_USUARIO/ai-mock-interviewer.git
cd ai-mock-interviewer

Passo 2: Configurar o Backend
cd backend
python -m venv venv

source venv/bin/activate # No Windows: venv\Scripts\activate
pip install -r requirements.txt
# Configure suas variáveis de ambiente (API Keys)
uvicorn app.main:app --reload

Passo 3: Configurar o Frontend
cd ../frontend
npm install
# Configure suas variáveis de ambiente (.env.local)
npm run dev

📈 Deploy
Este projeto está configurado para deploy contínuo:
● Frontend: Deploy automático via Vercel (conectado ao GitHub).
● Backend: Deploy configurado no Render.

🤝 Contribuição
Contribuições são bem-vindas! Sinta-se à vontade para abrir uma Issue ou enviar um Pull
Request.
