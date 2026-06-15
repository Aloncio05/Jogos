# Jogos do Aloncinho

Site simples de jogos criado com **HTML**, **CSS** e **JavaScript puro**, pronto para publicar no GitHub e fazer deploy na Vercel.

## Jogos Disponíveis

- **Jogo da Velha:** partida local para dois jogadores ou contra BOT.
- **Jogo da Memória:** encontre todos os pares no menor número de movimentos.
- **Adivinhe o Número:** tente descobrir o número secreto entre 1 e 100.
- **Jogo da Minhoca:** controle a minhoca, coma pontos e evite colisões.
- **Jogo do Detetive:** leia pistas e escolha o suspeito correto.
- **Cartas do Aloncinho:** jogo inspirado em Uno, com nomes, BOTs, código de convite e limite de 8 jogadores.

## Multiplayer Online

O jogo **Cartas do Aloncinho** possui modo online usando **Firebase Realtime Database**.

Para ativar:

1. Crie um projeto em `https://console.firebase.google.com`.
2. Crie um app Web no Firebase.
3. Ative **Realtime Database**.
4. Copie a configuração do app Web.
5. Substitua os valores em `firebase-config.js`.
6. Publique novamente no GitHub/Vercel.

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
  vercel.json
  README.md
```

## Deploy na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Acesse a Vercel.
3. Clique em **Add New Project**.
4. Importe o repositório.
5. Use as configurações padrão.
6. Clique em **Deploy**.

Como é um site estático, não precisa configurar build command.
