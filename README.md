# LeFinance — painel de controle financeiro

Site para uso pessoal: receitas, despesas, faturas de cartão,
investimentos, orçamento por categoria e metas — com login e dados
salvos na nuvem (Supabase), acessível de qualquer aparelho.

## Estrutura simples, de propósito

Tudo — HTML, estilo e a lógica do app — está num **único arquivo**,
`index.html`. Não tem pastas `css/` nem `js/`. Isso é proposital:
evita o erro mais comum ao publicar (subir os arquivos sem preservar
as subpastas, quebrando o visual e as funções do site). Os arquivos
de apoio são:

```
index.html            todo o site (HTML + estilo + lógica)
supabase-schema.sql    script para criar as tabelas no Supabase (projeto novo)
add-categories.sql     script extra, só para quem já tinha o site rodando
                       antes das categorias personalizadas existirem
add-closing-day.sql    script extra, só para quem já tinha o site rodando
                       antes do dia de fechamento do cartão existir
add-keywords.sql       script extra, só para quem já tinha o site rodando
                       antes das palavras-chave de categoria existirem
add-recurrences.sql    script extra, só para quem já tinha o site rodando
                       antes das recorrências (receitas/despesas fixas) existirem
add-payment-keywords.sql  script extra, só para quem já tinha o site rodando
                       antes das palavras-chave de forma de pagamento existirem
README.md              este arquivo
```

Se seu site já estava no ar, você não precisa rodar o
`supabase-schema.sql` de novo — abra o **SQL Editor** do Supabase e
rode só os scripts que ainda não rodou (`add-categories.sql`,
`add-closing-day.sql`, `add-keywords.sql`, `add-recurrences.sql`
e/ou `add-payment-keywords.sql`, dependendo de há quanto tempo seu
site existe). Rodar um script "extra" mais de uma vez não tem
problema, ele é seguro de repetir. Enquanto um script não for
executado, a tela correspondente mostra um aviso explicando isso —
o resto do site continua funcionando normalmente.

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
5. Ainda no SQL Editor, rode também o `add-keywords.sql` (script
   curto, adiciona a coluna de palavras-chave nas categorias — sem
   ele, a sugestão automática de categoria ao importar não funciona).
6. Vá em **Project Settings → API**. Copie a **Project URL** e a
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
2. Em **Add file → Upload files**, arraste os arquivos
   (`index.html`, `supabase-schema.sql`, `README.md`, etc.) soltos —
   como agora não há pastas, não tem como bagunçar a estrutura.
3. Clique em **Commit changes**.

Ou, se preferir linha de comando:

```bash
cd site-financeiro
git init
git add .
git commit -m "primeira versão do LeFinance"
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
  faturas dos cartões, planejado x real, forma de pagamento mais
  usada e um resumo compacto das suas recorrências.
- **Busca**: um campo discreto no topo da tela busca por descrição,
  categoria, forma de pagamento, cartão, valor ou data — em
  qualquer tela. Veja detalhes abaixo.
- **Transações**: lançar receitas e despesas, com categoria, forma
  de pagamento, cartão (se for crédito), parcelas e marcação de
  "despesa fixa" para contas recorrentes.
- **Cartões**: cadastro de cartões, com limite, cor, **dia de
  fechamento** e dia de vencimento. O resumo mostra nome, fatura
  atual, limite disponível e vencimento; clique em **"Ver
  detalhes"** para a próxima fatura, o limite comprometido, as
  parcelas em aberto, uma projeção de até 6 faturas e as
  transações do ciclo atual. Veja detalhes abaixo.
- **Recorrências**: cadastre receitas e despesas que se repetem
  (assinaturas, salário, aluguel), com valor, categoria, conta ou
  cartão, frequência e período. Veja detalhes abaixo.
- **Investimentos**: posições por tipo (renda fixa, ações, etc.).
- **Orçamento**: defina um teto mensal por categoria e acompanhe o
  quanto já gastou.
- **Metas**: uma lista simples de metas/anotações, com caixinha de
  concluído.
- **Categorias**: todas as categorias de receita e despesa —
  inclusive as que já vêm prontas — podem ser adicionadas,
  renomeadas ou removidas, e cada uma pode ganhar **palavras-chave**
  para a sugestão automática ao importar. Veja detalhes abaixo.
- **Importar**: suba a fatura ou extrato exportado do app do seu
  banco/cartão (.ofx ou .csv) em 3 etapas — arquivo, revisão e
  confirmação. Antes de confirmar, veja quantos lançamentos foram
  encontrados, quantos já têm categoria, quantos ainda precisam de
  revisão e quantos parecem duplicados. O site já sugere uma
  categoria pra cada lançamento com base nas palavras-chave
  cadastradas, sem precisar digitar nada.
- **Tutoriais**: um passo a passo rápido de cada parte do site, com
  uma etiqueta "novo" nos pontos que mudaram na última atualização.
- **Backup**: baixa um `.json` com tudo o que está salvo na nuvem,
  para guardar por segurança.

### Cartões — próxima fatura e projeção — novo

No card de cada cartão, o resumo agora mostra o **limite
disponível** (limite menos a fatura atual) em vez do limite total,
para facilitar de bater o olho quanto ainda dá pra gastar.

Clicando em **"Ver detalhes"** você vê:

- **Próxima fatura**: uma estimativa do valor da fatura seguinte,
  somando parcelas em aberto que caem nela e recorrências
  vinculadas a esse cartão.
- **Limite comprometido**: a fatura atual mais o total de todas as
  parcelas ainda não pagas — quanto do seu limite já está
  reservado para compromissos futuros.
- **Parcelas futuras**: a lista de compras parceladas que ainda têm
  parcelas pela frente.
- **Projeção de faturas**: uma estimativa dos próximos até 6 ciclos.
- **Transações do ciclo atual**: tudo que entra na fatura deste mês.

Essas projeções são estimativas — elas somam parcelas já
cadastradas e recorrências vinculadas ao cartão, mas não adivinham
lançamentos novos que você ainda não fez.

### Recorrências — novo

Uma tela própria para receitas e despesas que se repetem (Netflix,
salário, aluguel, etc.), separada das transações do dia a dia:

- Cadastre descrição, valor, categoria, conta ou cartão, frequência
  (semanal, mensal ou anual) e o período (início e, se quiser, fim).
- Pause ou reative uma recorrência sem precisar excluí-la.
- Na Visão geral, aparece só um resumo compacto: quantas
  recorrências estão ativas e o impacto mensal estimado — clique
  nele para ver a lista completa.
- Recorrências vinculadas a um cartão entram automaticamente na
  projeção de faturas futuras desse cartão (veja "Cartões" acima).
- Diferente da marcação "despesa fixa" em Transações (que é só uma
  etiqueta num lançamento já feito), a recorrência é um cadastro à
  parte, usado para as projeções — ela **não lança transações
  automaticamente**, então não há duplicidade entre as duas coisas.

Se o seu site já estava no ar antes dessa função existir, rode o
`add-recurrences.sql` no SQL Editor do Supabase antes de usar essa
tela (veja "Estrutura simples, de propósito" acima).

### Palavras-chave por forma de pagamento — novo

Além de sugerir a categoria, o site agora também pode sugerir a
**forma de pagamento** (e o cartão, quando for o caso) de cada
lançamento ao importar um extrato:

- Em **Cartões → Ver detalhes**, cada cartão tem suas próprias
  palavras-chave (ex.: "nubank", "roxinho") — quando uma delas
  aparece na descrição, o site sugere "Crédito" + esse cartão.
- Em **Cartões**, no painel "Palavras-chave por forma de pagamento",
  dá pra cadastrar termos para Pix, Débito, Dinheiro e Boleto (ex.:
  "pix" → Pix, "saque" → Dinheiro).
- Essas sugestões só aparecem ao importar um extrato **sem** escolher
  um cartão fixo para o arquivo inteiro — se você escolher um cartão
  na tela de Importar, todos os lançamentos daquele arquivo continuam
  indo para "Crédito" + esse cartão, como sempre foi.
- Você pode revisar e trocar a forma de pagamento sugerida de cada
  lançamento na prévia da importação, antes de confirmar.
- Assim como as palavras-chave de categoria, ao cadastrar uma
  palavra-chave nova aqui (num cartão ou numa forma de pagamento) o
  site também confere se algum lançamento já existente bate com ela
  — mesmo que já tenha outra forma de pagamento — e pergunta se você
  quer atualizar esses lançamentos também.

Se o seu site já estava no ar antes dessa função existir, rode o
`add-payment-keywords.sql` no SQL Editor do Supabase antes de usar
esses campos (veja "Estrutura simples, de propósito" acima).

### Busca — novo

Um campo de busca discreto, no topo de qualquer tela, procura
lançamentos por descrição, categoria, forma de pagamento, cartão,
valor ou data. Os resultados aparecem num painel pequeno — clique
em qualquer um para abrir e editar direto. Para filtros mais
específicos (período, valor mínimo/máximo, categoria, forma de
pagamento ou cartão), clique em **"Busca avançada"** ao final da
lista de resultados.

### Importar em 3 etapas — novo

A importação agora mostra visualmente em qual etapa você está —
**arquivo → revisão → confirmação**. Antes de confirmar, um resumo
mostra o total de lançamentos encontrados, quantos já têm categoria,
quantos ainda estão pendentes, quantos parecem duplicados e quantas
parcelas foram detectadas. Editar a data, a descrição ou o valor de
uma linha na prévia atualiza também a checagem de duplicidade dessa
linha.

### Parcelas detectadas automaticamente — novo

Se a descrição de um lançamento (ao importar) tiver um padrão como
"3/12" ou "01/06", o site já entende como parcela — preenche
sozinho o número da parcela atual e o total, sem precisar digitar.
Isso alimenta direto a projeção de faturas dos cartões. Como esse
padrão às vezes aparece em datas (ex.: "05/12" pode ser 5 de
dezembro), cada detecção mostra um aviso na prévia com a opção
**"não é parcela"** — clique nela para desfazer, se o site tiver
interpretado errado.

### Palavras-chave aplicadas em lançamentos antigos — novo

Ao cadastrar uma palavra-chave nova (em Categorias, Cartões ou nas
formas de pagamento), o site também confere os lançamentos que já
existem. Se algum bater com a palavra-chave — mesmo que já tenha uma
categoria ou forma de pagamento diferente —, ele pergunta se você
quer atualizar esse(s) lançamento(s) também, mostrando quantos
seriam alterados e para qual valor. Nada muda sem você confirmar.

### Sugestão automática de categoria ao importar

Cada categoria pode ter uma ou mais **palavras-chave** (ex.: "ifood",
"uber", "netflix"), cadastradas na tela de Categorias. O campo aceita
várias de uma vez, separadas por vírgula; cada termo aparece como uma
etiqueta e pode ser removido individualmente. Ao importar
uma fatura ou extrato (.ofx ou .csv), o site compara a descrição de
cada lançamento com essas palavras-chave e já preenche a categoria
sugerida na prévia — sinalizada com "🔎 sugerida por palavra-chave".
Você pode trocar a categoria manualmente antes de confirmar; nada é
salvo sem sua revisão.

As categorias padrão (Moradia, Alimentação, Transporte, etc.) já
vêm com algumas palavras-chave comuns na primeira vez que são
criadas na sua conta. Se o seu site já existia antes dessa função,
essas categorias não ganham as palavras-chave sozinhas — adicione
manualmente na tela de Categorias.

Ao cadastrar uma palavra-chave nova (em Categorias, ou nas
palavras-chave de Cartões/formas de pagamento — veja abaixo), o
site também verifica os **lançamentos que já existem**. Se algum
bater com a palavra-chave — mesmo que já tenha uma categoria
diferente —, você recebe uma confirmação perguntando se quer
atualizar esse(s) lançamento(s) também, mostrando para qual
categoria ficariam. Nada muda sem você confirmar.

Se o seu site já estava no ar antes dessa função existir, rode o
`add-keywords.sql` no SQL Editor do Supabase antes de usar o campo
(veja "Estrutura simples, de propósito" acima).

### Carregamento da sessão

Ao abrir, atualizar a página, voltar ao site depois de um tempo ou entrar,
a LeFinance espera a sessão do Supabase estar pronta antes de carregar os dados.
Se houver uma oscilação temporária de rede, as consultas são tentadas de
novo automaticamente. Caso o problema continue, aparece uma mensagem de
conexão — não uma mensagem de credenciais — e o console registra somente a
etapa e o tipo de falha, sem expor chaves, tokens ou dados pessoais.

### Painel de gráficos — novo

Na Visão geral e em Investimentos, cada gráfico tem o botão **recolher**.
Use-o para fechar temporariamente os painéis maiores e deixe a tela mais
compacta; clique em **expandir** para ver o gráfico de novo.

### Conferir senha — novo

Na tela de login, use o botão com o ícone de olho ao lado do campo de senha
para mostrar ou ocultar o que foi digitado antes de entrar ou criar a conta.

### Dia de fechamento do cartão

Ao cadastrar ou editar um cartão, agora dá pra informar o **dia de
fechamento** da fatura, além do dia de vencimento. Quando esse campo
está preenchido, a fatura mostrada (na tela de Cartões e no resumo
da Visão geral) passa a somar as despesas do **ciclo real da
fatura** — do dia seguinte ao fechamento anterior até o fechamento
deste mês — do mesmo jeito que aparece na fatura de verdade do seu
cartão, em vez de simplesmente somar pelo mês do calendário.

Se você deixar o dia de fechamento em branco, nada muda: a fatura
continua sendo calculada pelo mês do calendário, como sempre foi.

Se o seu site já estava no ar antes dessa função existir, rode o
`add-closing-day.sql` no SQL Editor do Supabase antes de usar o
campo (veja "Estrutura simples, de propósito" acima).

### Categorias totalmente editáveis

Agora **todas** as categorias — inclusive as que já vêm prontas,
como "Moradia" ou "Salário" — podem ser renomeadas ou removidas na
tela de Categorias. Na primeira vez que você entrar depois dessa
atualização, o site cria essas categorias padrão automaticamente
na sua conta (só as que ainda não existirem — se você já tinha
alguma categoria personalizada, ela continua do jeito que estava).

Ao renomear uma categoria, os lançamentos e metas de orçamento que
já usavam o nome antigo são atualizados sozinhos para o nome novo —
não precisa editar um por um. Remover uma categoria não apaga os
lançamentos que já usam aquele nome; eles só deixam de aparecer nas
listas de sugestão.

## Do que o site é feito

HTML, CSS e JavaScript num arquivo só — sem framework, sem etapa de
build. Duas bibliotecas externas, carregadas via CDN: **Chart.js**
(gráficos) e **Supabase JS** (login e banco de dados).
