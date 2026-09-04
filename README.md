# Razão — controle financeiro pessoal

Site para uso pessoal: receitas, despesas, faturas de cartão,
investimentos, orçamento por categoria e metas — com login e dados
salvos na nuvem (Supabase), acessível de qualquer aparelho.

## Estrutura simples, de propósito

Tudo — HTML, estilo e a lógica do app — está num **único arquivo**,
`index.html`. Não tem pastas `css/` nem `js/`. Isso é proposital:
evita o erro mais comum ao publicar (subir os arquivos sem preservar
as subpastas, quebrando o visual e as funções do site). Só existem
mais dois arquivos de apoio:

```
index.html            todo o site (HTML + estilo + lógica)
supabase-schema.sql    script para criar as tabelas no Supabase (projeto novo)
add-categories.sql     script extra, só para quem já tinha o site rodando
                       antes das categorias personalizadas existirem
README.md              este arquivo
```

Se seu site já estava no ar e você só quer adicionar a função de
categorias personalizadas, não precisa rodar o `supabase-schema.sql`
de novo — abra o **SQL Editor** do Supabase e rode só o
`add-categories.sql`.

## Como funciona a segurança

- O login é feito pelo Supabase Auth (e-mail + senha).
- Os dados ficam num banco Postgres no Supabase, com **Row Level
  Security**: cada linha só pode ser lida ou alterada por quem a
  criou. Mesmo que alguém veja o endereço do site ou o código-fonte,
  não consegue ver os seus dados sem a sua senha.
- As chaves `SUPABASE_URL` e `SUPABASE_ANON_KEY` que ficam visíveis
  no `index.html` **não são segredo** — elas só permitem falar com
  o banco; quem decide o que cada pessoa logada pode ver é a
  política de segurança (RLS), configurada pelo `supabase-schema.sql`.

## Passo 1 — Criar o projeto no Supabase

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e
   clique em **New project**.
2. Escolha um nome e uma senha de banco (essa senha não é a mesma
   do seu login no site — é só do projeto).
3. Espere o projeto terminar de criar (cerca de 1 minuto).
4. No menu lateral, abra **SQL Editor → New query**, cole todo o
   conteúdo do arquivo `supabase-schema.sql` e clique em **Run**.
   Isso cria as tabelas e já deixa a segurança configurada.
5. Vá em **Project Settings → API**. Copie a **Project URL** e a
   **anon public key**.

## Passo 2 — Configurar o site

Abra `index.html` (pode ser direto pelo editor do GitHub, sem
precisar baixar nada) e procure, logo depois de `<body>`, por este
trecho — são as duas únicas linhas que você precisa mudar:

```js
const SUPABASE_URL = "COLOQUE_AQUI_A_URL_DO_SEU_PROJETO_SUPABASE";
const SUPABASE_ANON_KEY = "COLOQUE_AQUI_A_ANON_KEY_DO_SEU_PROJETO_SUPABASE";
```

Cole ali a URL e a chave que você copiou no passo anterior, salve
(commit) e pronto.

Se quiser entrar na hora ao criar a conta, sem esperar confirmação
por e-mail, vá em **Authentication → Settings**, no Supabase, e
desligue a exigência de confirmar o e-mail (opcional, mas prático
já que é só você que vai usar).

## Passo 3 — Publicar no GitHub

Pelo próprio site do GitHub (sem precisar de terminal):

1. Crie um repositório novo, vazio.
2. Em **Add file → Upload files**, arraste os três arquivos
   (`index.html`, `supabase-schema.sql`, `README.md`) soltos —
   como agora não há pastas, não tem como bagunçar a estrutura.
3. Clique em **Commit changes**.

Ou, se preferir linha de comando:

```bash
cd site-financeiro
git init
git add .
git commit -m "primeira versão do Razão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/razao-financeiro.git
git push -u origin main
```

## Passo 4 — Publicar no Netlify

1. Entre em [app.netlify.com](https://app.netlify.com).
2. **Add new site → Import an existing project → GitHub**.
3. Escolha o repositório.
4. Deixe a configuração de build em branco (não há build).
5. Clique em **Deploy**. Em menos de um minuto o site está no ar.

Qualquer novo commit no `main` publica a atualização automaticamente.

Se quiser testar antes de publicar, é só abrir o `index.html`
direto no navegador (duplo clique) — funciona sem servidor.

## Uso no dia a dia

- **Visão geral**: saldo, receitas, despesas, gastos por categoria,
  faturas dos cartões, planejado x real e forma de pagamento mais usada.
- **Transações**: lançar receitas e despesas, com categoria, forma
  de pagamento, cartão (se for crédito), parcelas e marcação de
  "despesa fixa" para contas recorrentes.
- **Cartões**: cadastro de cartões, com fatura do mês calculada
  automaticamente a partir das transações.
- **Investimentos**: posições por tipo (renda fixa, ações, etc.).
- **Orçamento**: defina um teto mensal por categoria e acompanhe o
  quanto já gastou.
- **Metas**: uma lista simples de metas/anotações, com caixinha de
  concluído.
- **Categorias**: adicione suas próprias categorias de receita e
  despesa, além das que já vêm prontas — elas aparecem em todos os
  lugares que usam categoria (lançamentos, orçamento, filtros).
- **Importar**: suba a fatura ou extrato exportado do app do seu
  banco/cartão (.ofx ou .csv) e revise numa prévia antes de confirmar
  — sem precisar digitar lançamento por lançamento.
- **Tutoriais**: um resumo rápido de como usar cada parte do site.
- **Backup**: baixa um `.json` com tudo o que está salvo na nuvem,
  para guardar por segurança.

## Do que o site é feito

HTML, CSS e JavaScript num arquivo só — sem framework, sem etapa de
build. Duas bibliotecas externas, carregadas via CDN: **Chart.js**
(gráficos) e **Supabase JS** (login e banco de dados).
