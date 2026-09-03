# Razão — controle financeiro pessoal

Site para uso pessoal: receitas, despesas, faturas de cartão,
investimentos, orçamento por categoria e metas — com login e dados
salvos na nuvem (Supabase), acessível de qualquer aparelho.

## Como funciona a segurança

- O login é feito pelo Supabase Auth (e-mail + senha).
- Os dados ficam num banco Postgres no Supabase, com **Row Level
  Security**: cada linha só pode ser lida ou alterada por quem a
  criou. Mesmo que alguém veja o endereço do site ou o código-fonte,
  não consegue ver os seus dados sem a sua senha.
- A "anon key" que aparece em `js/config.js` **não é segredo** — ela
  só permite falar com o banco, mas é a política de segurança (RLS)
  que decide o que cada pessoa logada pode ver. É assim que todo
  app feito com Supabase funciona.

## Passo 1 — Criar o projeto no Supabase

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e
   clique em **New project**.
2. Escolha um nome e uma senha de banco (guarde essa senha, mas ela
   não é a mesma senha do seu login no site).
3. Espere o projeto terminar de criar (cerca de 1 minuto).
4. No menu lateral, abra **SQL Editor → New query**, cole todo o
   conteúdo do arquivo `supabase-schema.sql` (está na pasta do
   projeto) e clique em **Run**. Isso cria as tabelas e já deixa a
   segurança configurada.
5. Vá em **Project Settings → API**. Copie:
   - **Project URL**
   - **anon public key**

## Passo 2 — Configurar o site

Abra `js/config.js` e cole os dois valores:

```js
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

Pronto — agora o site já fala com o seu banco.

Se quiser, em **Authentication → Settings**, no Supabase, você pode
desligar a exigência de confirmar o e-mail ao criar conta, para
conseguir entrar na hora (útil já que é só você que vai usar).

## Passo 3 — Rodar localmente (opcional)

```bash
cd site-financeiro
python3 -m http.server 8080
```

e acessar `http://localhost:8080`.

## Passo 4 — Publicar no GitHub

```bash
cd site-financeiro
git init
git add .
git commit -m "primeira versão do Razão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/razao-financeiro.git
git push -u origin main
```

(Crie antes o repositório vazio em github.com.)

Se o repositório for **público**, qualquer pessoa consegue ver o
`js/config.js` com a URL e a anon key — e, como explicado acima,
isso é normal e não expõe seus dados. Se preferir mais discrição,
crie o repositório como **privado** (o Netlify continua funcionando
normalmente com repositórios privados).

## Passo 5 — Publicar no Netlify

1. Entre em [app.netlify.com](https://app.netlify.com).
2. **Add new site → Import an existing project → GitHub**.
3. Escolha o repositório `razao-financeiro`.
4. Deixe a configuração de build em branco (não há build).
5. Clique em **Deploy**. Em menos de um minuto o site está no ar.
6. Em **Site settings → Domain management** dá pra trocar o
   endereço `.netlify.app` por um nome mais fácil de lembrar.

Qualquer novo `git push` para `main` publica a atualização automaticamente.

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
  concluído — como o quadro "Metas/anotações" da planilha.
- **Backup**: baixa um `.json` com tudo o que está salvo na nuvem,
  para guardar por segurança.

## Do que o site é feito

HTML, CSS e JavaScript puros — sem framework, sem etapa de build.
Bibliotecas externas, carregadas via CDN: **Chart.js** (gráficos) e
**Supabase JS** (login e banco de dados).
