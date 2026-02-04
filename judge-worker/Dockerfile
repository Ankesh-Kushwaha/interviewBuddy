FROM node:18

# Install dependencies
RUN apt-get update && \
  apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release && \
  rm -rf /var/lib/apt/lists/*

# Install official Docker CLI (latest)
RUN curl -fsSL https://get.docker.com | sh

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "start"]
