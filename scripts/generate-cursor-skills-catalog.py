"""Regenerate docs/cursor-skills-catalog.md from .cursor/skills/*/SKILL.md frontmatter."""
from __future__ import annotations

import re
from pathlib import Path


def parse_frontmatter(text: str) -> tuple[str | None, str | None]:
    if not text.startswith("---"):
        return None, None
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return None, None
    fm = m.group(1)
    name: str | None = None
    desc: str | None = None
    lines = fm.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("name:"):
            name = line[5:].strip().strip('"').strip("'")
            i += 1
            continue
        if line.startswith("description:"):
            rest = line[12:].strip()
            if rest in (">-", "|", ">", "|+"):
                i += 1
                parts: list[str] = []
                while i < len(lines):
                    L = lines[i]
                    if L and not L[0].isspace() and re.match(
                        r"^[a-zA-Z_][a-zA-Z0-9_-]*\s*:", L
                    ):
                        break
                    if L.startswith("  ") or (parts and L.strip()):
                        parts.append(L.strip())
                    elif not L.strip():
                        parts.append(" ")
                    i += 1
                desc = " ".join(p for p in parts if p).strip()
                continue
            if rest.startswith('"'):
                if rest.count('"') >= 2:
                    desc = rest[1 : rest.index('"', 1)]
                else:
                    desc = rest[1:]
                    i += 1
                    while i < len(lines):
                        desc += " " + lines[i].strip()
                        if '"' in lines[i]:
                            desc = desc[: desc.rindex('"')]
                            break
                        i += 1
                i += 1
                continue
            if rest.startswith("'"):
                if rest.count("'") >= 2:
                    desc = rest[1 : rest.index("'", 1)]
                else:
                    desc = rest[1:]
                i += 1
                continue
            desc = rest.strip().strip('"').strip("'")
            i += 1
            continue
        i += 1
    return name, desc


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    root = repo / ".cursor" / "skills"
    rows: list[tuple[str, str, str]] = []
    for d in sorted(root.iterdir()):
        if not d.is_dir():
            continue
        f = d / "SKILL.md"
        if not f.exists():
            continue
        text = f.read_text(encoding="utf-8", errors="replace")
        name, desc = parse_frontmatter(text)
        folder = d.name
        if not name:
            name = folder
        if not desc:
            desc = "(no description in frontmatter)"
        rows.append((folder, name, desc))

    core: list[tuple[str, str, str]] = []
    doc: list[tuple[str, str, str]] = []
    composio: list[tuple[str, str, str]] = []

    doc_names = {"docx", "pdf", "pptx", "xlsx"}
    for folder, name, desc in rows:
        if folder.endswith("-automation"):
            composio.append((folder, name, desc))
        elif folder in doc_names:
            doc.append((folder, name, desc))
        else:
            core.append((folder, name, desc))

    out = []
    out.append("# Cursor skills catalog")
    out.append("")
    out.append(
        "Brief descriptions from each skill’s `SKILL.md` YAML frontmatter under "
        f"**`.cursor/skills/`**. **{len(rows)}** skills total."
    )
    out.append("")

    out.append("## Core (curated repo folders)")
    out.append("")
    out.append("| Folder | Name | Description |")
    out.append("|--------|------|-------------|")
    for folder, name, desc in core:
        esc = desc.replace("|", "\\|").replace("\n", " ")
        out.append(f"| `{folder}` | {name} | {esc} |")
    out.append("")

    out.append("## Document processing (docx / pdf / pptx / xlsx)")
    out.append("")
    out.append("| Folder | Name | Description |")
    out.append("|--------|------|-------------|")
    for folder, name, desc in doc:
        esc = desc.replace("|", "\\|").replace("\n", " ")
        out.append(f"| `{folder}` | {name} | {esc} |")
    out.append("")

    if composio:
        out.append("## Composio automation (*-automation)")
        out.append("")
        out.append(
            f"{len(composio)} skills — Rube MCP / Composio toolkits. Each entry is a one-line summary."
        )
        out.append("")
        out.append("| Folder | Name | Description |")
        out.append("|--------|------|-------------|")
        for folder, name, desc in composio:
            esc = desc.replace("|", "\\|").replace("\n", " ")
            out.append(f"| `{folder}` | {name} | {esc} |")

    md = "\n".join(out)
    dest = repo / "docs" / "cursor-skills-catalog.md"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(md, encoding="utf-8")
    print(f"Wrote {dest} ({len(rows)} skills)")


if __name__ == "__main__":
    main()
