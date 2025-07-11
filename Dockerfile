# Use imagem leve do Node
FROM node:18-slim

# Instale dependências do sistema (se precisar de Chromium)
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Cria e define a pasta do projeto
WORKDIR /app

# Copia só os arquivos essenciais
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta do Express
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "index.js"]


