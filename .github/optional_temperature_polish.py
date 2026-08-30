from pathlib import Path

app = Path('app.js')
text = app.read_text()
old = "  temperaturePanel.hidden = !enabled;\n}"
new = "  temperaturePanel.hidden = !enabled;\n  temperatureTab.parentElement.style.gridTemplateColumns = enabled ? '' : '1fr';\n}"
if old not in text:
    raise SystemExit('temperature tab layout marker not found')
app.write_text(text.replace(old, new, 1))

recipe = Path('js/recipe.js')
text = recipe.read_text()
old = "  if (recipe.temperature?.enabled !== undefined && typeof recipe.temperature.enabled !== 'boolean') {"
new = """  if (recipe.temperature !== undefined
    && (!recipe.temperature || typeof recipe.temperature !== 'object' || Array.isArray(recipe.temperature))) {
    errors.push('temperature must be an object when provided.');
  }
  if (recipe.temperature?.enabled !== undefined && typeof recipe.temperature.enabled !== 'boolean') {"""
if old not in text:
    raise SystemExit('temperature object validation marker not found')
recipe.write_text(text.replace(old, new, 1))
