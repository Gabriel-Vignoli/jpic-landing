# DESIGN.md · JPIC Importados (Grupo VIP)

Direção: vitrine de eletrônicos à noite. O topo é escuro (grafite quente), com o robô em 3D num piso de madeira iluminado como produto em estúdio. O resto da página é papel claro, para ler com calma. O dourado vem do logo JP&C e aparece pouco. O verde é só para a ação (WhatsApp).

Sem referência do UXKIN (não conectado): direção tirada da marca (logo em Cinzel dourado, criativos pretos com laranja) e da LP original.

## Cor
| Token | Valor | Papel |
|---|---|---|
| `--night-900` | `#12110F` | Fundo das seções escuras (topo, CTA final) |
| `--night-800` | `#1B1916` | Superfícies sobre o escuro |
| `--night-600` | `#34302A` | Bordas no escuro |
| `--night-200` | `#C9C2B6` | Texto secundário no escuro |
| `--paper` | `#F4F1EB` | Fundo claro da página |
| `--surface` | `#FFFFFF` | Cartões |
| `--line` | `#E2DCD1` | Bordas e divisores no claro |
| `--ink` | `#17150F` | Texto principal |
| `--ink-soft` | `#5B554B` | Texto secundário (6,6:1 no papel) |
| `--gold` | `#CDA651` | Acento no escuro: números, detalhes do logo |
| `--gold-ink` | `#8A6A1F` | Acento no claro (texto, 5,1:1) |
| `--go` | `#0E7A3F` | Ação principal: botões do WhatsApp (branco 5,4:1) |
| `--go-hover` | `#0A6533` | Hover da ação |
| `--lidar` | `#FF6A13` | Só no 3D: anel do sensor do robô (igual à foto) |

Sem gradiente decorativo. Um único brilho radial atrás do robô, que é luz de cena.

## Tipografia
- Títulos: **Archivo** (eixo de largura em 112 a 125, peso 700 a 800). Técnico, de produto, foge do Inter.
- Texto: **Instrument Sans** 400/500/600.
- Logo: **Cinzel** (só no logo).
- Escala (px): 13 · 15 · 17 (corpo) · 20 · 26 · 36 · 52 · clamp até 88 (hero). Entrelinha 1,55 no corpo, 0,95 a 1,05 nos títulos.
- Números de preço e CNPJ com `tabular-nums`.

## Espaço
Base 8. Seções: 120px no desktop, 80px no celular. Conteúdo até 1240px. Texto corrido até 62ch.

## Forma e profundidade
Raio: 6 (tags), 14 (botões, campos), 22 (cartões). Uma sombra só, para cartões em hover: `0 18px 40px -24px rgba(23,21,15,.35)`.

## Componentes
- Botão principal: verde, ícone do WhatsApp, 56px de altura, efeito magnético leve no desktop. Foco: anel de 3px dourado com 3px de afastamento.
- Botão secundário: contorno de 1,5px, transparente.
- Link: sublinhado de 1px que cresce no hover.
- Cartão de oferta: foto em moldura neutra, categoria em versalete pequeno, preço grande tabular.
- Header: transparente sobre o escuro, vira papel com borda ao sair do topo.
- Barra fixa do WhatsApp no celular depois do topo.

## Imagem e ícone
- Fotos de produto em fundo neutro, cortadas sem o selo do criativo.
- Ícones: traço de 1,75px, cantos redondos, desenhados no próprio SVG (sem emoji).
- 3D só no topo (Three.js). As outras animações são GSAP + ScrollTrigger, sempre com `prefers-reduced-motion` respeitado.
