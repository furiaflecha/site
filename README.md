# Fúria Flecha — loja oficial

Site estático com checkout hospedado da InfinitePay e backend em Netlify Functions. O navegador envia somente produto, tamanho e quantidade; preços e totais são definidos novamente no servidor.

## Arquitetura

- `comprar.html` e `assets/script.js`: carrinho e início do checkout.
- `netlify/functions/create-order.mjs`: cria e persiste o pedido antes de solicitar o link.
- `netlify/functions/webhook.mjs`: valida pedido e valor, e confirma o pagamento.
- `netlify/functions/payment-check.mjs`: consulta manual usada como fallback.
- `netlify/functions/order-status.mjs`: retorna somente o estado público necessário.
- Netlify Blobs: persistência MVP dos pedidos.
- `obrigado.html`: retorno do checkout; nunca considera o redirect como prova de pagamento.

Os preços vigentes são R$ 49,90 (`4990` centavos) e R$ 99,90 (`9990` centavos). O valor recebido do navegador é ignorado.

## Configuração local

Requisitos: Node.js 20 ou superior e uma conta Netlify.

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env` e preencha `INFINITEPAY_HANDLE` sem `$`.
3. Habilite **Vendas → Checkout → Configurações → Checkout Integrado** na InfinitePay.
4. Autentique e vincule o projeto com `npx netlify login` e `npx netlify link`.
5. Inicie com `npm run dev` e abra `http://localhost:8888/comprar.html`.

Para receber um webhook durante o desenvolvimento, a InfinitePay precisa alcançar uma URL HTTPS pública. Use um deploy de preview da Netlify ou um túnel HTTPS e defina `PUBLIC_SITE_URL` com essa origem. `webhook.site` é útil para observar o payload, mas não substitui a função, pois não valida nem atualiza o pedido.

## Variáveis na Netlify

Configure em **Site configuration → Environment variables**:

- `INFINITEPAY_HANDLE`: InfiniteTag sem `$` (secreta no backend).
- `PUBLIC_SITE_URL`: URL HTTPS canônica; opcional quando a variável automática `URL` corresponde ao domínio desejado.
- `INFINITEPAY_API_URL`: opcional; por padrão `https://api.checkout.infinitepay.io`. Só altere se a InfinitePay fornecer oficialmente outro ambiente.

Não existe token adicional no fluxo público documentado. `.env` é ignorado pelo Git e o handle não aparece no HTML ou JavaScript do navegador.

## Deploy e teste seguro

1. Faça o deploy na Netlify e confira se o domínio usa HTTPS.
2. Confirme que o Checkout Integrado está habilitado na conta.
3. Antes de pagar, peça ao suporte da InfinitePay um sandbox ou procedimento oficial de teste. A documentação pública não fornece credenciais nem endpoint de sandbox.
4. Crie um pedido e confirme no log da função que o link foi retornado, sem registrar dados pessoais ou de cartão.
5. Verifique o webhook em `/.netlify/functions/webhook` e o retorno em `/obrigado.html`.
6. Execute `npm test` para validar catálogo, centavos e tentativas de adulteração de preço.

Não use dados fictícios em checkout de produção e não faça teste com dinheiro real sem autorização explícita.

## Segurança e limitações do MVP

- O pedido recebe UUID e é persistido antes da chamada à InfinitePay.
- Cada pedido recebe um segredo de webhook de 256 bits. A InfinitePay recebe esse segredo apenas na URL do callback e o banco guarda somente seu hash; callbacks sem o segredo correto são rejeitados com comparação resistente a timing attacks.
- Cada tentativa de checkout recebe uma chave idempotente: cliques repetidos ou respostas de rede perdidas reutilizam o mesmo pedido, em vez de criar cobranças duplicadas.
- O webhook exige `order_nsu` existente, transação informada e valor idêntico ao total salvo.
- Uma transação confirmada é reivindicada para um único pedido, reduzindo ataques de replay entre pedidos.
- Reenvios são idempotentes: um pedido já pago não é confirmado novamente.
- Apenas webhook ou `payment_check` podem marcar o pedido como pago.
- Criação de pedidos, consulta e fallback possuem rate limiting nativo na borda da Netlify, validação de origem e tamanho máximo de payload. O limite é aplicado antes de executar código ou acessar armazenamento.
- A Netlify aplica CSP, HSTS, bloqueio de iframes, isolamento de origem, política de permissões e proteção contra MIME sniffing.
- Dados de cartão nunca passam por este sistema.
- A documentação pública da InfinitePay não descreve assinatura criptográfica própria. O segredo único de callback acrescenta autenticação ao canal, combinado com UUID imprevisível, pedido persistido e valor exato. Se a InfinitePay disponibilizar uma assinatura oficial, ela deve substituir ou complementar esse mecanismo.
- Netlify Blobs é adequado ao MVP. Para operação com estoque, expedição, auditoria e alto volume, migre pedidos para um banco transacional e processe efeitos posteriores por fila.
- Netlify Blobs não oferece transações nem bloqueios atômicos. A combinação de segredo por callback, confirmação na InfinitePay e reivindicação de transação reduz replay no MVP, mas um banco transacional com restrição `UNIQUE(transaction_nsu)` é o próximo passo para garantias fortes sob concorrência hostil.
- A resposta do webhook inclui a gravação no Blob. Monitore a duração na Netlify; se ela se aproximar de um segundo, adote banco de baixa latência/filas conforme os recursos oferecidos pela conta.

Referência: [Checkout Integrado da InfinitePay](https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-integrado-da-infinitepay).
