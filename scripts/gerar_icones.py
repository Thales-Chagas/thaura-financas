# -*- coding: utf-8 -*-
"""Gera os ícones do PWA a partir da logo enviada (folha + seta + gráfico)."""
from pathlib import Path

from PIL import Image

PROJETO = Path(__file__).resolve().parent.parent
PUBLIC = PROJETO / "public"
LOGO = PROJETO / "src" / "logo.png"  # logo completa, fundo transparente

original = Image.open(LOGO).convert("RGBA")
W, H = original.size

# Emblema = parte gráfica acima do texto (recorta pelo alfa do topo da imagem)
topo = original.crop((0, 0, W, int(H * 0.60)))
bbox = topo.getbbox()
emblema = topo.crop(bbox)

# Centraliza num quadrado com folga
lado = max(emblema.size)
quad = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
quad.paste(emblema, ((lado - emblema.width) // 2, (lado - emblema.height) // 2), emblema)


def gerar(tamanho, nome, fundo=None, escala=0.84):
    base = Image.new("RGBA", (tamanho, tamanho), fundo or (0, 0, 0, 0))
    alvo = int(tamanho * escala)
    e = quad.resize((alvo, alvo), Image.LANCZOS)
    base.paste(e, ((tamanho - alvo) // 2, (tamanho - alvo) // 2), e)
    if fundo:
        base = base.convert("RGB")
    base.save(PUBLIC / nome)
    print("gerado:", nome)


BRANCO = (255, 255, 255)
gerar(192, "pwa-192.png", BRANCO)
gerar(512, "pwa-512.png", BRANCO)
gerar(512, "pwa-512-maskable.png", BRANCO, escala=0.62)  # zona segura maskable
gerar(180, "apple-touch-icon.png", BRANCO)
gerar(64, "favicon.png")  # transparente para a aba do navegador

# Emblema transparente para usar dentro do app (sidebar, telas de login)
quad.resize((256, 256), Image.LANCZOS).save(PROJETO / "src" / "emblema.png")
print("gerado: src/emblema.png")
