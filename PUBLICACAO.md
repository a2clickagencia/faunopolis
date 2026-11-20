# Publicação do Faunópolis — passo a passo

## O que já está no ar
- **Site:** https://faunopolis.a2clickagencia.workers.dev. Fica no Cloudflare, na sua conta, como um *Worker* com arquivos estáticos chamado `faunopolis`.
- **Código:** https://github.com/a2clickagencia/faunopolis (repositório público).
- **Instalador do Windows:** https://github.com/a2clickagencia/faunopolis/releases/latest. O botão "💻 Baixar para Windows" no menu do site leva para essa página.

## Atualizar o site
```powershell
npm run deploy:web
```
O comando monta a pasta `dist-web/` (apenas os arquivos do jogo) e publica no Cloudflare. Os jogadores recebem a versão nova ao recarregar a página.

**Para publicar automaticamente a cada `git push`:**
1. No Cloudflare, abra *My Profile → API Tokens → Create Token* e use o modelo **"Edit Cloudflare Workers"**.
2. No GitHub, abra *Settings → Secrets and variables → Actions* e crie dois segredos:
   - `CLOUDFLARE_API_TOKEN`, com o token criado no passo 1;
   - `CLOUDFLARE_ACCOUNT_ID`, que aparece na página inicial do painel do Cloudflare.

## Lançar uma nova versão do instalador
1. Mude `"version"` no `package.json`, por exemplo para `7.2.0`.
2. Faça o commit e envie a tag:
   ```powershell
   git tag v7.2.0; git push; git push --tags
   ```
3. O GitHub Actions (workflow "Instalador Windows") monta o `.exe` e cria a Release.

Também é possível gerar o instalador no próprio PC com `npm run dist`. O arquivo sai em `dist\`.

## Domínio próprio (opcional)
No Cloudflare, abra *Workers & Pages → faunopolis → Settings → Domains & Routes → Add → Custom domain*. Por exemplo: `jogar.seudominio.com.br`.

## Salvamento do progresso
| Versão | Onde salva |
|---|---|
| App do Windows | `Documentos\Faunópolis\saves\*.faunopolis`, com backup `.bak` da gravação anterior. O menu do jogo tem o botão "🗂️ Abrir pasta dos jogos salvos". |
| Site / app instalado pelo navegador | No armazenamento do navegador. "Exportar jogo" gera um arquivo `.faunopolis`, que pode ser importado no app do Windows e vice-versa. |

## Observação sobre o aviso do Windows
O instalador não tem certificado de assinatura de código, que é pago (cerca de US$ 200 a 400 por ano). Por isso o SmartScreen mostra "O Windows protegeu o computador" nas primeiras instalações. O jogador deve clicar em **Mais informações → Executar assim mesmo**. Se você comprar um certificado, o electron-builder assina o instalador automaticamente com as variáveis `CSC_LINK` e `CSC_KEY_PASSWORD`.
