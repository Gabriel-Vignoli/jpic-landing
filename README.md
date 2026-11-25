# JPIC Importados · Landing page do Grupo VIP

Landing page do grupo VIP de ofertas no WhatsApp da JPIC Importados (robô aspirador, patinete e bike elétrica).

- **Topo em 3D (Three.js):** um robô aspirador modelado em código limpa um piso de madeira. A rolagem conduz 4 etapas: topo, "Mapeia a casa", "Aspira e passa pano" e "Volta sozinho para a base".
- **Animações (GSAP + ScrollTrigger + ScrollToPlugin):** títulos palavra por palavra, linha do "Como funciona", botões magnéticos e rolagem animada nos links do menu.
- **CTAs direto no WhatsApp:** os botões de oferta abrem a conversa com a mensagem já citando o produto.
- **Acessível:** navegação por teclado e versão estática com `prefers-reduced-motion`.

Decisões de cor, tipografia e componentes em [`DESIGN.md`](DESIGN.md).

## Rodar

Não tem build. Os módulos JS precisam de um servidor:

```bash
python -m http.server 5180
# abrir http://127.0.0.1:5180
```

Three.js e GSAP vêm do jsDelivr.

## Antes de publicar

Os dados do cliente ainda são placeholders, destacados em dourado na página (`[...]`):

- Link do grupo e número do WhatsApp: objeto `CONTATO` no topo de `js/main.js`.
- Preços, modelos, garantia, pagamento, prazo, avaliações e fotos: no `index.html`.

## Estrutura

```
index.html      página
styles.css      estilos (tokens no topo)
js/main.js      animações, links e contato
js/scene.js     cena 3D do robô
assets/         fotos dos produtos
```
