import re

md_path = "/root/.openclaw/workspace/fablino/rosy/rosy-script.md"
out_path = "/root/.openclaw/workspace/fablino/rosy/rosy-styled.md"

# Color map for characters
colors = {
    "Narrateur": "#666666",
    "Rosy": "#E8614D",
    "Romy": "#2D6A4F",
    "Mommy": "#7C3AED",
    "Roby": "#2B7BBF",
    "Cerbère": "#991B1B",
    "La Sorcière": "#6B21A8",
    "La Créature": "#D4A843",
}

with open(md_path, "r") as f:
    lines = f.readlines()

html_parts = []
html_parts.append("""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
body { font-family: 'Nunito', sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.7; }
h1 { text-align: center; font-size: 1.8rem; margin-bottom: 0.5rem; }
h2 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 0.3rem; margin-top: 2.5rem; font-size: 1.3rem; }
.line { margin: 0.6rem 0; }
.narrator { font-style: italic; color: #666; padding: 0.3rem 0; }
.narrator .speaker { display: none; }
.character { padding: 0.4rem 0.8rem; border-left: 3px solid; border-radius: 0 8px 8px 0; background: #fafafa; margin: 0.5rem 0; }
.speaker { font-weight: 800; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.1rem; }
.text { font-size: 0.95rem; }
.legend { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0 2rem; padding: 1rem; background: #f8f8f8; border-radius: 8px; }
.legend-item { display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; font-weight: 700; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; }
</style>
</head>
<body>
""")

# Legend
html_parts.append('<div class="legend">')
for name, color in colors.items():
    label = "Narrateur (kursiv)" if name == "Narrateur" else name
    html_parts.append(f'<div class="legend-item"><div class="legend-dot" style="background:{color}"></div>{label}</div>')
html_parts.append('</div>')

for line in lines:
    line = line.strip()
    if not line:
        continue
    if line.startswith("# "):
        html_parts.append(f"<h1>{line[2:]}</h1>")
        continue
    if line.startswith("## "):
        html_parts.append(f"<h2>{line[3:]}</h2>")
        continue
    
    # Match Speaker: "text"
    m = re.match(r'^([\w\s\é\è]+?):\s*"(.+)"$', line)
    if m:
        speaker = m.group(1).strip()
        text = m.group(2)
        color = colors.get(speaker, "#333")
        if speaker == "Narrateur":
            html_parts.append(f'<div class="line narrator"><div class="text">{text}</div></div>')
        else:
            html_parts.append(f'<div class="line character" style="border-color:{color}"><div class="speaker" style="color:{color}">{speaker}</div><div class="text">{text}</div></div>')
    else:
        html_parts.append(f'<p>{line}</p>')

html_parts.append("</body></html>")

with open("/root/.openclaw/workspace/fablino/rosy/rosy-styled.html", "w") as f:
    f.write("\n".join(html_parts))

print("HTML generated")
