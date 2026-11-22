# 🐾 Faunópolis

Construa, cuide e faça crescer o seu zoológico: 64 espécies, 7 biomas, no computador, no celular e no tablet, brinquedos, lagos nos recintos, visitantes, equipe e finanças. Você pode jogar em 2D ou em 3D.

## Como jogar

| Opção | Como | Onde fica o progresso |
|---|---|---|
| 📱 **Celular e tablet** (Android, iPhone, iPad) | Abra o site e toque em **📲 Instalar** no menu do jogo. No iPhone e no iPad: Safari → Compartilhar → **Adicionar à Tela de Início**. Controles de toque completos e funciona offline. | No aparelho. Use *Exportar / enviar arquivo* para mandar o jogo para o Drive ou WhatsApp. |
| 🌐 **No navegador** | Acesse **https://faunopolis.a2clickagencia.workers.dev**. Dá para instalar como aplicativo pelo ícone ⊕ da barra de endereço, e depois da primeira visita o jogo funciona offline. | No navegador. Use *Exportar jogo* para fazer backup. |
| 💻 **Windows (instalador)** | Baixe `Faunopolis-Setup.exe` em [**Releases**](https://github.com/a2clickagencia/faunopolis/releases/latest), instale e abra pelo atalho "Faunópolis". | Em arquivos, na pasta **Documentos\Faunópolis\saves**. O progresso continua lá depois de atualizar ou reinstalar o jogo. |

> O instalador não tem assinatura digital paga. Na primeira vez, o Windows SmartScreen pode avisar: clique em **Mais informações → Executar assim mesmo**.

## Para desenvolvedores

```bash
npm install          # instala o Electron, o electron-builder e o wrangler
npm start            # abre o app para computador
npm run dist         # gera dist/Faunopolis-Setup-<versão>.exe
npm run deploy:web   # monta dist-web/ e publica o site no Cloudflare
```

- **Nova versão do instalador:** atualize `version` no `package.json` e depois rode `git tag v7.2.0 && git push --tags`. O GitHub Actions monta o `.exe` e cria a Release sozinho.
- **Site automático a cada push:** cadastre os segredos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no repositório. Sem eles, publique o site manualmente com `npm run deploy:web`.

Veja também [`LEIA-ME.md`](LEIA-ME.md), [`NOVIDADES_v2.4.md`](NOVIDADES_v2.4.md), [`NOVIDADES_v2.3.md`](NOVIDADES_v2.3.md), [`NOVIDADES_v7.2.md`](NOVIDADES_v7.2.md), [`NOVIDADES_v7.1.md`](NOVIDADES_v7.1.md) e [`PUBLICACAO.md`](PUBLICACAO.md).
