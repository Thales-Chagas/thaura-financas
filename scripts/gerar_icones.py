# -*- coding: utf-8 -*-
"""Gera os ícones do PWA (folha branca sobre fundo verde esmeralda)."""
import math
from pathlib import Path

from PIL import Image, ImageDraw

PUBLIC = Path(__file__).resolve().parent.parent / "public"
PUBLIC.mkdir(exist_ok=True)

EMERALD = (5, 150, 105)  # emerald-600


def pontos_folha(cx, cy, comprimento, abertura, rotacao_graus):
    """Folha = lente formada por dois arcos de círculo, inclinada."""
    L = comprimento / 2          # metade do comprimento (até a ponta)
    d = L / math.tan(abertura)   # afastamento dos centros dos círculos
    R = math.hypot(L, d)
    rot = math.radians(rotacao_graus)
    pts = []
    # arco superior (círculo centrado em (0, +d)) da ponta esquerda à direita
    a0 = math.atan2(-d, -L)
    a1 = math.atan2(-d, L)
    for i in range(33):
        a = a0 + (a1 - a0) * i / 32
        pts.append((R * math.cos(a), d + R * math.sin(a)))
    # arco inferior (círculo centrado em (0, -d)) da direita de volta à esquerda
    b0 = math.atan2(d, L)
    b1 = math.atan2(d, -L)
    for i in range(33):
        a = b0 + (b1 - b0) * i / 32
        pts.append((R * math.cos(a), -d + R * math.sin(a)))
    # rotaciona e translada
    out = []
    for x, y in pts:
        out.append((cx + x * math.cos(rot) - y * math.sin(rot),
                    cy + x * math.sin(rot) + y * math.cos(rot)))
    return out


def desenhar(tamanho, raio_pct, nome):
    s = 4  # superamostragem para bordas suaves
    n = tamanho * s
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * raio_pct), fill=EMERALD)

    cx, cy = n / 2, n / 2
    folha = pontos_folha(cx, cy, n * 0.62, math.radians(58), -45)
    d.polygon(folha, fill=(255, 255, 255, 255))

    # nervura central (no eixo da folha, a 45°)
    L = n * 0.62 / 2
    vx, vy = math.cos(math.radians(-45)), math.sin(math.radians(-45))
    d.line([(cx - vx * L * 0.85, cy - vy * L * 0.85),
            (cx + vx * L * 0.85, cy + vy * L * 0.85)],
           fill=EMERALD, width=int(n * 0.035))

    img = img.resize((tamanho, tamanho), Image.LANCZOS)
    img.save(PUBLIC / nome)
    print("gerado:", nome)


desenhar(192, 0.22, "pwa-192.png")
desenhar(512, 0.22, "pwa-512.png")
desenhar(512, 0.0, "pwa-512-maskable.png")  # maskable: fundo até a borda
desenhar(180, 0.0, "apple-touch-icon.png")  # iOS aplica o arredondamento
desenhar(64, 0.22, "favicon.png")
