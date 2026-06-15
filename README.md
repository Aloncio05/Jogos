# Jogos do Aloncinho

Site simples de jogos criado com **HTML**, **CSS** e **JavaScript puro**, pronto para publicar no GitHub e fazer deploy na Vercel.

## Jogos Disponíveis

- **Jogo da Velha:** partida local para dois jogadores ou contra BOT.
- **Jogo da Memória:** encontre todos os pares no menor número de movimentos.
- **Adivinhe o Número:** tente descobrir o número secreto entre 1 e 100.
- **Jogo da Minhoca:** controle a minhoca, coma pontos e evite colisões.
- **Jogo do Detetive:** leia pistas e escolha o suspeito correto.
- **Cartas do Aloncinho:** jogo inspirado em Uno, com nomes, BOTs, código de convite, sala online e limite de 8 jogadores.

## Regras do Cartas do Aloncinho

- Baralho com cartas numeradas por cor: um `0` e duas cartas de `1` a `9`.
- Cartas de ação por cor: `+2`, `Inverter` e `Pular`.
- Curingas: `Curinga` e `+4`.
- Cada jogador começa com 7 cartas.
- O jogo começa em sentido horário.
- A jogada deve combinar cor, número/símbolo ou usar curinga.
- `+2`: próximo jogador compra duas cartas e perde a vez.
- `Inverter`: muda o sentido da rodada. Com dois jogadores funciona como pular.
- `Pular`: próximo jogador perde a vez.
- `Curinga`: permite escolher a próxima cor.
- `+4`: permite escolher a cor, próximo jogador compra quatro cartas e perde a vez.
- `UNO!`: ao ficar com uma carta, o jogador deve apertar o botão `UNO!` antes de jogar.
- Pontuação: numéricas valem o número, ações valem 20 e curingas valem 50.

## Multiplayer Online

O jogo **Cartas do Aloncinho** possui modo online usando **Firebase Realtime Database**.

Para ativar:

1. Crie um projeto em `https://console.firebase.google.com`.
2. Crie um app Web no Firebase.
3. Ative **Realtime Database**.
4. Copie a configuração do app Web.
5. Configure as variáveis de ambiente na Vercel.
6. Faça um novo deploy.

Variáveis necessárias na Vercel:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Para este projeto, a URL do Realtime Database é:

```text
https://jogos-aloncinho-default-rtdb.firebaseio.com
```

Regras simples para teste no Realtime Database:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Essas regras são abertas e servem apenas para protótipo. Para produção, adicione autenticação e regras mais restritivas.

## Como Jogar Online

1. Abra o jogo **Cartas do Aloncinho**.
2. Clique em **Criar sala online**.
3. Informe seu nome em **Nome do jogador** e clique em **Adicionar**.
4. Clique em **Copiar convite** e envie para seus amigos.
5. Cada amigo abre o link, informa o nome e entra na sala.
6. Use **Adicionar BOT** se quiser completar a mesa com robôs.
7. Clique em **Iniciar partida**.

Limite: até **8 jogadores** por sala.

## Como Rodar Localmente

Abra o arquivo `index.html` no navegador.

Ou, se quiser servir localmente:

```bash
bunx serve .
```

## Estrutura

```text
site-jogos-basicos/
  index.html
  styles.css
  script.js
  firebase-config.js
  scripts/
    generate-firebase-config.js
  vercel.json
  README.md
```

## Deploy na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Acesse a Vercel.
3. Clique em **Add New Project**.
4. Importe o repositório.
5. Em **Environment Variables**, cadastre as variáveis `VITE_FIREBASE_*`.
6. Em **Build Command**, use `bun run build`.
7. Em **Output Directory**, deixe vazio ou `./`.
8. Clique em **Deploy**.
