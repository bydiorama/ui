"""Build the refined previews: 6s and 9s, landscape (4:3) and portrait (4:5).

The cue sheet V is the only thing that differs between the 6s and 9s cuts. The
code excerpts are read verbatim from the repository so they cannot drift from
the source they quote.
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
repo = root.parents[2]
base = (root / 'previews/brand-grid-reveal-directed.html').read_text()
timeline = (root / 'source/refined-timeline.js').read_text()
head = base[:base.index('<script>')]

# Each block quotes real lines and releases a region of the UI (see RELEASE in the timeline).
EXCERPTS = [
    dict(name='Tokens', file='packages/tokens/src/seed.ts', first=112, last=117, releases=['shell']),
    dict(name='Layout', file='packages/tokens/src/seed.ts', first=75, last=80, releases=['header', 'heading', 'sidebar', 'search']),
    dict(name='Components', file='registry/ui/thumbnail/thumbnail.tsx', first=59, last=64, releases=['brand', 'library']),
    dict(name='Metrics', file='registry/ui/progress/progress.tsx', first=63, last=68, releases=['metric0', 'metric1', 'metric2']),
]
MAX_COLUMNS = 54  # 11px Paper Mono inside the 448px widget, 20px inset and 40px gutter
blocks = []
for e in EXCERPTS:
    lines = (repo / e['file']).read_text().split('\n')[e['first'] - 1:e['last']]
    assert all(len(l) <= MAX_COLUMNS for l in lines), (e['file'], [l for l in lines if len(l) > MAX_COLUMNS])
    blocks.append(dict(name=e['name'], file=e['file'], from_=e['first'], lines=lines, releases=e['releases']))
for b in blocks:
    b['from'] = b.pop('from_')

LANDSCAPE = dict(viewport=dict(height=222, top=20, bottom=32, pad=22), widget=dict(right=32, height=304))
PORTRAIT = dict(viewport=dict(height=160, top=8, bottom=12, pad=8), widget=dict(right=544, height=242))

# Cue sheets, seconds. A block must stay on screen until it has committed, so
# each typeStart is at least 80ms after the previous commit (checked by
# validate-refined.mjs); the bare frame before the second commit is the breath
# that makes the Layout cascade the hero.
CUES = {
    '6s': dict(duration=6.0, lineStagger=.045, typeStart=[.30, .825, 1.27, 1.80],
               generated=2.45, widget={'in': .10, 'out': 2.55}, photo=3.25, ticks=[3.7, 3.9, 4.1],
               retire=dict(start=4.5, spread=.03)),
    '9s': dict(duration=9.0, lineStagger=.075, typeStart=[.40, 1.25, 2.10, 2.95],
               generated=4.0, widget={'in': .10, 'out': 4.2}, photo=4.5, ticks=[5.3, 5.6, 5.9],
               retire=dict(start=6.7, spread=.06)),
}


def cue_sheet(length, layout):
    v = dict(CUES[length], blocks=blocks)
    for k, val in layout.items():
        v[k] = {**v.get(k, {}), **val} if isinstance(val, dict) else val
    return v


def must_replace(text, old, new):
    assert old in text, f'anchor missing: {old[:70]}'
    return text.replace(old, new)


def portrait_source(src):
    # 960x1200 plane, 1600-wide construction coordinates cropped at x=128 (Paper portrait artboard).
    a = src.index('function fit() {')
    b = src.index('\nfunction groupFor', a)
    src = src[:a] + '''function fit(){
 const k=Math.min(innerWidth/960,innerHeight/1200);
 stage.style.transform=`scale(${k})`;
 stage.style.left=`${(innerWidth-960*k)/2-128*k}px`;
 stage.style.top=`${(innerHeight-1200*k)/2}px`;
}
''' + src[b:]
    for old, new in [('r.width>1200', 'r.width>1100'), ('r.x<925', 'r.x<857'), ('(r.x-616)/208', '(r.x-548)/208'),
                     ("width:'1280px',height:'784px'", "width:'1144px',height:'784px'"),
                     ('inset(208px 160px 208px 160px round', 'inset(208px 296px 208px 160px round')]:
        src = must_replace(src, old, new)
    return src


def write(name, length, mode):
    layout = PORTRAIT if mode == 'portrait' else LANDSCAPE
    src = portrait_source(timeline) if mode == 'portrait' else timeline
    css = ''
    if mode == 'portrait':
        css = '#app{left:160px!important;translate:0 -50%!important;width:1144px!important;border:1px solid #ECE7E3}#stage{overflow:visible}#ground{inset:-1000px}'
    html = head.replace('</style>', css + '\n</style>', 1)
    (root / 'previews' / name).write_text(html + '<script>\nconst V=' + json.dumps(cue_sheet(length, layout)) + ';\n' + src + '\n</script></html>')


for length in CUES:
    for mode in ('landscape', 'portrait'):
        suffix = '' if mode == 'landscape' else '-portrait'
        write(f'brand-grid-reveal-refined-{length}{suffix}.html', length, mode)
print('Built refined previews:', ', '.join(f'{l}/{m}' for l in CUES for m in ('landscape', 'portrait')))
