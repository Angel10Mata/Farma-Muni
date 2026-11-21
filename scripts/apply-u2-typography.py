#!/usr/bin/env python3
"""Apply U2 typography replacements to TSX files (mechanical pass)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

SKIP_SMALL_PX = {"ReciboVenta.tsx"}

REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"text-\[8px\]"), "text-etiqueta"),
    (re.compile(r"text-\[9px\]"), "text-etiqueta"),
    (re.compile(r"text-\[10px\]"), "text-etiqueta"),
    (re.compile(r"text-\[11px\]"), "text-etiqueta"),
    (re.compile(r"(?<![:#])text-\[#8DA78E\]"), "text-look-2-salvia-menta"),
    (re.compile(r"dark:text-\[#A3BEB0\]"), "dark:text-look-1-salvia-suave"),
    (re.compile(r"text-zinc-500 dark:text-zinc-400"), "text-texto-tenue"),
    (re.compile(r"text-slate-500 dark:text-slate-400"), "text-texto-tenue"),
    (re.compile(r"text-slate-400 dark:text-slate-500"), "text-texto-tenue"),
    (re.compile(r"(?<![:#a-z-])text-zinc-400(?![a-z])"), "text-texto-tenue"),
    (re.compile(r"(?<![:#a-z-])text-slate-400(?![a-z])"), "text-texto-tenue"),
    (re.compile(r"dark:text-zinc-400"), ""),
    (re.compile(r"dark:text-zinc-500"), ""),
    (re.compile(r"dark:text-zinc-600"), ""),
    (re.compile(r"dark:text-slate-500"), ""),
    (re.compile(r"dark:text-slate-600"), ""),
    (re.compile(r"text-muted-foreground"), "text-texto-tenue"),
    (re.compile(r"text-foreground/40"), "text-texto-tenue"),
    (re.compile(r"text-foreground/60"), "text-texto-tenue"),
    (re.compile(r"text-black/60"), "text-texto-tenue"),
    (re.compile(r"dark:text-white/40"), "text-texto-tenue"),
]

H1_FONT_BLACK = re.compile(
    r'(<h1[^>]*className="[^"]*)\bfont-black\b',
    re.MULTILINE,
)


def clean_class_tokens(content: str) -> str:
    def fix_class(m: re.Match[str]) -> str:
        tokens = m.group(1).split()
        seen: list[str] = []
        for t in tokens:
            if t and t not in seen:
                seen.append(t)
        return f'className="{" ".join(seen)}"'

    return re.sub(r'className="([^"]*)"', fix_class, content)


def process_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    content = original
    skip_px = path.name in SKIP_SMALL_PX

    if not skip_px:
        for pattern, repl in REPLACEMENTS[:4]:
            content = pattern.sub(repl, content)

    for pattern, repl in REPLACEMENTS[4:]:
        content = pattern.sub(repl, content)

    content = H1_FONT_BLACK.sub(r"\1font-bold", content)
    content = clean_class_tokens(content)

    if content != original:
        path.write_text(content, encoding="utf-8")
        return True
    return False


def main() -> None:
    roots = [Path(p) for p in sys.argv[1:]]
    if not roots:
        print("Usage: apply-u2-typography.py <dir-or-file> ...")
        sys.exit(1)

    changed = 0
    for root in roots:
        files = (
            [root]
            if root.is_file()
            else sorted(root.rglob("*.tsx"))
        )
        for f in files:
            if process_file(f):
                changed += 1
                print(f"updated: {f}")
    print(f"done, {changed} file(s)")


if __name__ == "__main__":
    main()
