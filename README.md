# Razão — controle financeiro pessoal

Site estático, para uso pessoal, para acompanhar receitas e despesas,
faturas de cartão, investimentos e metas de orçamento.

Não tem servidor nem banco de dados: tudo é salvo no `localStorage` do
seu navegador, no seu próprio aparelho. Ninguém mais acessa esses dados
a não ser que você exporte o backup e compartilhe o arquivo.

## Estrutura

```
index.html      página única, todas as seções
css/style.css   estilo
js/app.js       toda a lógica (dados, telas, gráficos)
```

## Rodar localmente

Não precisa instalar nada. Basta abrir `index.html` no navegador,
ou, se preferir um servidor local simples:

```bash
cd site-financeiro
python3 -m http.server 8080
```

e acessar `http://localhost:8080`.

## Publicar no GitHub

```bash
cd site-financeiro
git init
git add .
git commit -m "primeira versão do Razão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/razao-financeiro.git
git push -u origin main
```

(Crie antes o repositório vazio em github.com — sem README, sem .gitignore
— para não dar conflito no primeiro push.)

## Publicar no Netlify

1. Entre em [app.netlify.com](https://app.netlify.com) e faça login.
2. **Add new site → Import an existing project → GitHub**.
3. Escolha o repositório `razao-financeiro`.
4. Configuração de build: deixe **tudo em branco** (não há build —
   "Build command" vazio, "Publish directory" = `.` ou vazio).
5. Clique em **Deploy**. Em menos de um minuto o site estará no ar
   num endereço tipo `https://algum-nome.netlify.app`.
6. Se quiser, em **Site settings → Domain management** você troca
   esse endereço por um nome mais fácil de lembrar (ainda no domínio
   gratuito `.netlify.app`) ou aponta um domínio próprio.

Qualquer novo `git push` para `main` publica a atualização automaticamente.

## Sobre os dados

- Os dados ficam só no navegador em que você usa o site. Se trocar de
  computador, celular ou navegador, eles **não aparecem automaticamente**.
- Use a aba **Backup**, dentro do site, para baixar um arquivo `.json`
  com tudo, e a mesma aba para importar esse arquivo em outro navegador.
- Vale o hábito de baixar um backup de vez em quando e guardar num
  lugar seguro (Google Drive, por exemplo) — se limpar os dados do
  navegador ou desinstalar, o histórico se perde.
- Como o site fica público na internet (mesmo que só você saiba o
  endereço), não coloque nele números de conta, senhas ou dados que
  não sejam simplesmente valores e categorias de gasto.

## Do que o site é feito

HTML, CSS e JavaScript puros — sem framework, sem etapa de build.
O único recurso externo é a biblioteca **Chart.js**, carregada via
CDN, para os gráficos de pizza. Isso significa que abrir e publicar
o site é tão simples quanto subir os três arquivos.
