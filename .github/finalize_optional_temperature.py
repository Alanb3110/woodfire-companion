from pathlib import Path

# 1) Collapse the tab navigation to one column when Temperature is hidden.
styles = Path('styles.css')
text = styles.read_text()
marker = ".tab { min-height: 46px; border: 0; border-radius: 11px; background: transparent; color: var(--muted); font-weight: 780; }"
addition = ".tabs:has(.tab[hidden]) { grid-template-columns: 1fr; }\n" + marker
if ".tabs:has(.tab[hidden])" not in text:
    if marker not in text:
        raise SystemExit('tabs marker not found')
    text = text.replace(marker, addition, 1)
styles.write_text(text)

# 2) Reject malformed top-level temperature blocks before checking fields.
recipe = Path('js/recipe.js')
text = recipe.read_text()
marker = "  if (recipe.temperature?.enabled !== undefined && typeof recipe.temperature.enabled !== 'boolean') {"
addition = """  if (recipe.temperature !== undefined
    && (!recipe.temperature || typeof recipe.temperature !== 'object' || Array.isArray(recipe.temperature))) {
    errors.push('temperature must be an object when provided.');
  }
""" + marker
if "temperature must be an object when provided." not in text:
    if marker not in text:
        raise SystemExit('temperature validation marker not found')
    text = text.replace(marker, addition, 1)
recipe.write_text(text)
