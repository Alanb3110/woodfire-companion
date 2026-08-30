from pathlib import Path
import re

app = Path('app.js')
text = app.read_text()

replacements = [
    (
        "import { createTemperatureController } from './js/temperature-ui.js';",
        "import { createTemperatureController } from './js/temperature-ui.js';\nimport { defaultTemperatureTarget, temperatureTrackingEnabled } from './js/temperature.js';",
        'temperature helper import',
    ),
    (
        "const resetChecklistBtn = $('resetChecklistBtn');\nconst installHelpBtn = $('installHelpBtn');",
        "const resetChecklistBtn = $('resetChecklistBtn');\nconst temperatureTab = document.querySelector('.tab[data-tab=\"temperature\"]');\nconst temperaturePanel = $('temperature');\nconst installHelpBtn = $('installHelpBtn');",
        'temperature DOM refs',
    ),
    (
        "getDefaultTarget: () => recipe?.temperature?.defaultTargetC || 93,",
        "getDefaultTarget: () => defaultTemperatureTarget(recipe) ?? 93,",
        'temperature target callback',
    ),
]
for old, new, label in replacements:
    if old not in text:
        raise SystemExit(f'{label} marker not found')
    text = text.replace(old, new, 1)

patterns = [
    (
        r"(\s*state\.servings = configServings;\n\s*state\.mealTime = configMealTime;)\n\s*state\.temperatureTarget = resetSession \? \(recipe\.temperature\?\.defaultTargetC \|\| 93\) : state\.temperatureTarget;\n\s*state\.view = 'cook';",
        "\\1\n  const temperatureEnabled = temperatureTrackingEnabled(recipe);\n  if (resetSession) state.temperatureTarget = temperatureEnabled ? defaultTemperatureTarget(recipe) : null;\n  if (!temperatureEnabled && state.activeTab === 'temperature') state.activeTab = 'planning';\n  state.view = 'cook';",
        'activateRecipe temperature state',
    ),
    (
        r"(\s*syncJournal\(\);\n\s*renderTasks\(\);)\n\s*temperatureController\.render\(\);\n\s*switchTab\(state\.activeTab \|\| 'planning', false\);",
        "\\1\n  if (temperatureEnabled) temperatureController.render();\n  switchTab(state.activeTab || 'planning', false);",
        'activateRecipe temperature render',
    ),
    (
        r"function renderCookShell\(\) \{\n([\s\S]*?fillTimePicker\(cookMealHour, cookMealMinute, state\.mealTime\);)\n\}",
        "function renderCookShell() {\n\\1\n  const enabled = temperatureTrackingEnabled(recipe);\n  temperatureTab.hidden = !enabled;\n  temperaturePanel.hidden = !enabled;\n}",
        'renderCookShell',
    ),
    (
        r"function switchTab\(tabName, persist = true\) \{[\s\S]*?\n\}",
        "function switchTab(tabName, persist = true) {\n  const resolvedTab = tabName === 'temperature' && !temperatureTrackingEnabled(recipe) ? 'planning' : tabName;\n  state.activeTab = resolvedTab;\n  if (persist) saveState();\n  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === resolvedTab));\n  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === resolvedTab));\n  if (resolvedTab === 'temperature' && !cookView.hidden) temperatureController.focus();\n}",
        'switchTab',
    ),
]
for pattern, replacement, label in patterns:
    text, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'{label} pattern matched {count} times')
app.write_text(text)

recipe = Path('js/recipe.js')
text = recipe.read_text()
pattern = r"\s*if \(recipe\.temperature\?\.defaultTargetC !== undefined && !isFiniteNumber\(recipe\.temperature\.defaultTargetC\)\) \{\n\s*errors\.push\('temperature\.defaultTargetC must be numeric when provided\.'\);\n\s*\}"
replacement = """
  if (recipe.temperature?.enabled !== undefined && typeof recipe.temperature.enabled !== 'boolean') {
    errors.push('temperature.enabled must be boolean when provided.');
  }
  if (recipe.temperature?.defaultTargetC !== undefined
    && (!isFiniteNumber(recipe.temperature.defaultTargetC)
      || recipe.temperature.defaultTargetC < 30
      || recipe.temperature.defaultTargetC > 120)) {
    errors.push('temperature.defaultTargetC must be between 30 and 120 °C when provided.');
  }
  if (recipe.temperature?.enabled === true && !isFiniteNumber(recipe.temperature.defaultTargetC)) {
    errors.push('temperature.defaultTargetC is required when temperature tracking is enabled.');
  }
  if (recipe.temperature?.enabled === false && recipe.temperature.defaultTargetC !== undefined) {
    errors.push('temperature.defaultTargetC must be omitted when temperature tracking is disabled.');
  }"""
text, count = re.subn(pattern, replacement, text, count=1)
if count != 1:
    raise SystemExit(f'recipe temperature config pattern matched {count} times')

marker = "if (!COMPLETION_TYPES.has(step.completion.type)) errors.push(`Invalid completion type for step ${step.id || '?'}: ${step.completion.type}`);"
addition = marker + """
      if (step.completion.type === 'temperature'
        && (recipe.temperature?.enabled === false || !isFiniteNumber(recipe.temperature?.defaultTargetC))) {
        errors.push(`Temperature completion for step ${step.id || '?'} requires enabled recipe temperature tracking with defaultTargetC.`);
      }"""
if marker not in text:
    raise SystemExit('completion validation marker not found')
text = text.replace(marker, addition, 1)
recipe.write_text(text)
