from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from pathlib import Path

OUT = Path(__file__).parent / 'output' / 'cogniva-brand-guideline.pdf'
OUT.parent.mkdir(exist_ok=True)
forest, sage, teal, ivory, ink = '#173F36', '#9BAF91', '#4F7F80', '#F7F6EF', '#17211F'

pages = [
('Cogniva', 'Turn habits into progress.\n\nBRAND GUIDELINE  ·  VERSION 1.0  ·  OCTOBER 2026', 'cover'),
('01 — Brand foundation', 'Cogniva is a calm, intelligent study and productivity workspace that turns everyday habits into clearer priorities, focused sessions, and measurable academic progress.\n\nBRAND PROMISE\nHelp students understand what deserves attention now, work with less friction, and learn from their own patterns over time.\n\nPERSONALITY\nCalm · Intelligent · Supportive · Progress-oriented\n\nPOSITIONING\nAn adaptive academic productivity companion—not just a to-do list, timer, or chatbot.', 'text'),
('02 — Naming and messaging', 'COGNIVA\nA name inspired by cognition: thinking, learning, and understanding. It is broad enough to grow beyond student tools while remaining connected to intelligent learning.\n\nMESSAGE HIERARCHY\n1  Cogniva turns habits into progress.\n2  Notes, tasks, adaptive focus, AI study support, and academic insights in one workflow.\n3  Users feel less overwhelmed and more in control of their next step.\n4  Recommendations are explainable and based on real product signals.\n\nVOICE\nCalm clarity. Useful intelligence. Human support. Honest confidence.', 'text'),
('03 — Logo system', 'The mark is a quiet, open “C” formed by two balanced paths. The open form suggests clarity and possibility; the lower path introduces forward movement without using a literal arrow.\n\nVARIANTS\nPrimary lockup: mark + Cogniva wordmark.\nCompact lockup: mark + wordmark without tagline.\nApp mark: symbol only inside a square container.\nMonochrome: one-color black, white, or Forest.\n\nRULES\nKeep clear space equal to the height of the inner opening. Do not stretch, rotate, outline, add gradients, or place on busy imagery. Minimum app mark: 20 px.', 'logo'),
('04 — Color system', 'CORE PALETTE\n\nFOREST   #173F36     Primary brand, headings, primary actions\nSAGE     #9BAF91     Calm secondary accent and progress surfaces\nTEAL     #4F7F80     Focus, links, active states, charts\nIVORY    #F7F6EF     Default canvas and warm background\nINK      #17211F     Reading text and high contrast\n\nSTATUS COLORS\nSuccess #3F7D5A · Warning #B98236 · Critical #B94B4B · Information #4F7F80\n\nUse approximately 60% Ivory, 25% Forest/Ink, 10% Sage, and 5% Teal or status colors.', 'colors'),
('05 — Typography', 'PRIMARY UI FONT\nInter — clean, legible, and suitable for web and desktop.\n\nDISPLAY ALTERNATIVE\nManrope — use sparingly for warmer hero headlines.\n\nTYPE SCALE\nDisplay  40–64 px / 700\nH1       32 px / 700\nH2       24 px / 650\nBody     16 px / 400\nCaption  12–13 px / 500\n\nUse sentence case, generous line-height, and short paragraphs. Avoid all-caps except for small labels or data categories.', 'text'),
('06 — Visual and UI language', 'DESIGN PRINCIPLES\n1  Reduce cognitive load: show the next useful decision first.\n2  Make intelligence explainable: every recommendation has a plain-language reason.\n3  Use calm hierarchy: reserve strong contrast for meaningful actions.\n4  Reward progress visibly without creating anxiety.\n\nCOMPONENT DIRECTION\nSoft 12–16 px corners, subtle borders, little or no shadow. Forest primary buttons; Ivory/Forest secondary buttons. Prefer clear lines, bars, and rings over decorative 3D charts.\n\nMOTION\n150–250 ms transitions. Animation communicates state, never pressure.', 'text'),
('07 — Product experience', 'COGNIVA WORKFLOW\nUnderstand habits  →  Organize notes + tasks  →  Focus on the next step  →  Review progress\n\nFEATURE NAMING\nNotes: Cogniva Notes / AI Summary\nTasks: Priority Board / Next Tasks\nFocus: Adaptive Focus / Focus Session\nAnalytics: Progress / Learning Insights\nAssessment: Academic Snapshot\nAssistant: Cogniva Study Assistant\n\nDo not call every feature “AI”. Describe fuzzy prioritization as adaptive logic or an explainable priority engine.', 'text'),
('08 — Copy examples', 'LANDING PAGE\nHeadline: Make progress easier to see.\nSubheadline: Cogniva brings your notes, tasks, focus time, and learning patterns into one calm workspace.\nCTA: Start your workspace\n\nPRODUCT MICROCOPY\n“This task is high priority because its deadline is near and its difficulty is high.”\n“A 40-minute session gives this task enough room without overloading your focus.”\n“Good work. One focused session moved this task forward.”\n\nACCESSIBILITY\nEvery chart, status, and recommendation needs a text explanation. Never communicate urgency with color alone.', 'text'),
('09 — Applications and governance', 'APPLICATIONS\nWeb app: Ivory canvas, Forest navigation, Teal active states, Sage progress surfaces.\nDesktop app: App mark on Forest or Ivory.\nSocial profile: App mark only with generous padding.\nAcademic report: Full lockup on Ivory with Forest headings.\n\nASSET CHECKLIST\nSVG primary · SVG monochrome · transparent PNG · favicon · app icon · CSS color tokens · font configuration · UI component library · approved copy library\n\nGOVERNANCE\nThe logo shown is a concept direction. Before public launch, complete production SVG tracing and final typeface licensing. Review every new surface against calmness, clarity, explainability, accessibility, and accuracy.', 'text'),
]

def draw_mark(ax, x, y, s=1.0, color=forest):
    # simple open C + progress path, intentionally vector-like
    import numpy as np
    t = np.linspace(np.deg2rad(35), np.deg2rad(325), 80)
    ax.plot(x+s*np.cos(t), y+s*np.sin(t), color=color, lw=18*s, solid_capstyle='round')
    t2 = np.linspace(np.deg2rad(205), np.deg2rad(25), 45)
    ax.plot(x+s*.2*np.cos(t2), y-s*.2+s*.45*np.sin(t2), color=sage, lw=12*s, solid_capstyle='round')

with PdfPages(OUT) as pdf:
    for title, body, kind in pages:
        fig = plt.figure(figsize=(8.27, 11.69), facecolor=ivory)
        ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis('off')
        if kind == 'cover':
            draw_mark(ax, .5, .62, .12)
            ax.text(.5, .40, title, ha='center', va='center', fontsize=42, weight='bold', color=forest)
            ax.text(.5, .34, body, ha='center', va='top', fontsize=13, color=teal, linespacing=1.8)
        else:
            ax.text(.08, .91, title, fontsize=23, weight='bold', color=forest)
            ax.plot([.08, .92], [.885, .885], color=teal, lw=1.2)
            if kind == 'logo':
                draw_mark(ax, .5, .69, .11)
                ax.text(.5, .49, 'Cogniva', ha='center', fontsize=29, weight='bold', color=forest)
                ax.text(.5, .445, 'Turn habits into progress.', ha='center', fontsize=12, color=teal)
                y = .35
            elif kind == 'colors':
                cols = [(forest,'FOREST  #173F36'),(sage,'SAGE  #9BAF91'),(teal,'TEAL  #4F7F80'),(ivory,'IVORY  #F7F6EF'),(ink,'INK  #17211F')]
                for i,(c,l) in enumerate(cols):
                    x=.1+i*.17; ax.add_patch(FancyBboxPatch((x,.68),.13,.09,boxstyle='round,pad=.01',facecolor=c,edgecolor='none'))
                    ax.text(x,.64,l,fontsize=8,color=ink)
                y=.56
            else: y=.82
            ax.text(.08, y, body, va='top', fontsize=11.5, color=ink, linespacing=1.55, wrap=True)
        ax.text(.08, .045, 'COGNIVA  ·  Turn habits into progress.', fontsize=8, color=teal)
        pdf.savefig(fig, facecolor=fig.get_facecolor(), bbox_inches='tight'); plt.close(fig)
print(OUT)
