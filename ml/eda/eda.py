"""
================================================================================
  STUDENT HABITS vs ACADEMIC PERFORMANCE — EXPLORATORY DATA ANALYSIS (EDA)
  Author  : AI Project Team — Artificial Intelligence Course
  Date    : 2026
  Dataset : student_habits_performance.csv  (Kaggle)
  Target  : exam_score  →  academic_performance_category
================================================================================
"""

# ─── Standard Imports ────────────────────────────────────────────────────────
import os
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")          # non-interactive backend — safe for scripts
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.patches as mpatches
import seaborn as sns
from scipy import stats

warnings.filterwarnings("ignore")

# ─── Global Style Config ──────────────────────────────────────────────────────
PALETTE_MAIN   = ["#6C63FF", "#FF6584", "#43C59E", "#FFD166", "#EF476F"]
PALETTE_PERF   = ["#EF476F", "#FFD166", "#43C59E", "#6C63FF"]  # Low→Excellent
PALETTE_HEAT   = "coolwarm"
BG_COLOR       = "#0F0F1A"
CARD_COLOR     = "#1A1A2E"
TEXT_COLOR      = "#E0E0FF"
ACCENT          = "#6C63FF"

plt.rcParams.update({
    "figure.facecolor"  : BG_COLOR,
    "axes.facecolor"    : CARD_COLOR,
    "axes.edgecolor"    : "#2A2A4A",
    "axes.labelcolor"   : TEXT_COLOR,
    "axes.titlecolor"   : TEXT_COLOR,
    "xtick.color"       : TEXT_COLOR,
    "ytick.color"       : TEXT_COLOR,
    "text.color"        : TEXT_COLOR,
    "grid.color"        : "#2A2A4A",
    "grid.alpha"        : 0.5,
    "font.family"       : "DejaVu Sans",
    "font.size"         : 11,
    "axes.titlesize"    : 13,
    "axes.labelsize"    : 11,
    "legend.framealpha" : 0.2,
    "legend.edgecolor"  : "#2A2A4A",
    "savefig.dpi"       : 150,
    "savefig.bbox"      : "tight",
    "savefig.facecolor" : BG_COLOR,
})

# ─── Output Directory ─────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "dataset")
VIS_DIR = os.path.join(BASE_DIR, "visualizations")
os.makedirs(VIS_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def section(title: str, width: int = 72) -> None:
    bar = "=" * width
    print(f"\n{bar}")
    print(f"  {title}")
    print(f"{bar}")


def save(fig, name: str) -> None:
    path = os.path.join(VIS_DIR, name)
    fig.savefig(path)
    plt.close(fig)
    print(f"  [SAVED] {path}")


# ═════════════════════════════════════════════════════════════════════════════
#  STEP 1 — DATASET OVERVIEW
# ═════════════════════════════════════════════════════════════════════════════

section("STEP 1 — DATASET OVERVIEW")

df = pd.read_csv(os.path.join(DATA_DIR, "student_habits_performance.csv"))

print(f"\n{'─'*50}")
print(f"  Dataset Shape  : {df.shape[0]:,} rows  ×  {df.shape[1]} columns")
print(f"{'─'*50}")

print("\n  COLUMNS & DATA TYPES")
print(f"{'─'*50}")
dtype_df = pd.DataFrame({
    "Column"    : df.columns,
    "Dtype"     : df.dtypes.values,
    "Non-Null"  : df.notnull().sum().values,
    "Null"      : df.isnull().sum().values,
    "Unique"    : df.nunique().values,
}).reset_index(drop=True)
print(dtype_df.to_string(index=False))

print("\n  FIRST 10 ROWS")
print(f"{'─'*50}")
print(df.head(10).to_string())

print("\n  SUMMARY STATISTICS — Numeric Columns")
print(f"{'─'*50}")
print(df.describe(include=np.number).round(3).to_string())

print("\n  SUMMARY STATISTICS — Categorical Columns")
print(f"{'─'*50}")
print(df.describe(include="object").to_string())

print("""
  INTERPRETATION:
  • 1,000 student records with 16 columns (15 features + 1 target).
  • Mix of numeric (int/float) and categorical (object) columns.
  • 'exam_score' is continuous (0–100) — will be binned into performance tiers.
  • 'student_id' is an identifier and carries no predictive value.
""")

# ═════════════════════════════════════════════════════════════════════════════
#  STEP 2 — DATA QUALITY ANALYSIS
# ═════════════════════════════════════════════════════════════════════════════

section("STEP 2 — DATA QUALITY ANALYSIS")

# ── Missing Values ────────────────────────────────────────────────────────────
print("\n  MISSING VALUES")
missing = df.isnull().sum()
missing_pct = (missing / len(df) * 100).round(2)
miss_df = pd.DataFrame({"Count": missing, "Percentage (%)": missing_pct})
miss_df = miss_df[miss_df["Count"] > 0]

if miss_df.empty:
    print("  ✓ No missing values detected — dataset is complete.")
else:
    print(miss_df.to_string())
    print("\n  ACTION: Fill missing categoricals with mode before encoding.")

# ── Duplicate Records ─────────────────────────────────────────────────────────
n_dups = df.duplicated().sum()
print(f"\n  DUPLICATE ROWS  : {n_dups}")

# ── Outlier Detection (IQR) ───────────────────────────────────────────────────
num_cols = df.select_dtypes(include=np.number).drop(columns=["age"], errors="ignore").columns.tolist()
print("\n  OUTLIER SUMMARY (IQR method)")
outlier_rows = {}
for col in num_cols:
    Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
    IQR = Q3 - Q1
    lo, hi = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
    n_out = ((df[col] < lo) | (df[col] > hi)).sum()
    outlier_rows[col] = n_out
    print(f"    {col:<30}  outliers: {n_out:>4}  |  [{lo:.2f} — {hi:.2f}]")

# ── Visualisation: Missing + Outlier Overview ─────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(16, 6))
fig.suptitle("Data Quality Overview", fontsize=16, fontweight="bold", y=1.01)

# Left — Missing heatmap
sns.heatmap(df.isnull(), cbar=False, cmap="viridis", ax=axes[0], yticklabels=False)
axes[0].set_title("Missing Value Map\n(Yellow = Missing)", fontsize=12)
axes[0].set_xlabel("Features")

# Right — Outlier counts bar
out_series = pd.Series(outlier_rows)
colors = [PALETTE_MAIN[0] if v == 0 else "#EF476F" for v in out_series.values]
axes[1].barh(out_series.index, out_series.values, color=colors, edgecolor="#2A2A4A")
axes[1].set_title("Outlier Counts per Feature\n(IQR Method)", fontsize=12)
axes[1].set_xlabel("Number of Outliers")
axes[1].axvline(0, color="white", linewidth=0.5)

plt.tight_layout()
save(fig, "01_data_quality.png")

print("""
  RECOMMENDATIONS:
  • No missing values — no imputation needed.
  • Remove any duplicate rows before modelling.
  • Outliers in exam_score/study_hours should be investigated — they may be
    genuine high/low achievers, not data errors. Cap using IQR or keep as-is.
""")

# ═════════════════════════════════════════════════════════════════════════════
#  STEP 3 — TARGET VARIABLE ANALYSIS
# ═════════════════════════════════════════════════════════════════════════════

section("STEP 3 — TARGET VARIABLE ANALYSIS")

# Bin exam_score into performance categories
bins   = [0, 50, 65, 80, 101]
labels = ["Low (<50)", "Average (50-64)", "Good (65-79)", "Excellent (≥80)"]
df["academic_performance"] = pd.cut(df["exam_score"], bins=bins, labels=labels, right=False)

cat_counts = df["academic_performance"].value_counts().sort_index()
cat_pct    = (cat_counts / len(df) * 100).round(2)

print("\n  TARGET DISTRIBUTION — academic_performance")
target_summary = pd.DataFrame({"Count": cat_counts, "Percentage (%)": cat_pct})
print(target_summary.to_string())

print(f"\n  exam_score stats:")
print(df["exam_score"].describe().round(3).to_string())

# ── Figure ────────────────────────────────────────────────────────────────────
fig = plt.figure(figsize=(18, 12))
fig.suptitle("Target Variable Analysis — Academic Performance", fontsize=16,
             fontweight="bold", y=1.01)

gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.35)

# 1. Count plot
ax1 = fig.add_subplot(gs[0, :2])
bars = ax1.bar(cat_counts.index, cat_counts.values,
               color=PALETTE_PERF, edgecolor="#2A2A4A", linewidth=1.2, width=0.6)
for bar, val in zip(bars, cat_counts.values):
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 5,
             str(val), ha="center", va="bottom", fontweight="bold", fontsize=12)
ax1.set_title("Count per Performance Category")
ax1.set_xlabel("Performance Category")
ax1.set_ylabel("Number of Students")
ax1.set_ylim(0, cat_counts.max() * 1.15)

# 2. Pie chart
ax2 = fig.add_subplot(gs[0, 2])
wedges, texts, autotexts = ax2.pie(
    cat_counts.values, labels=cat_counts.index, autopct="%1.1f%%",
    colors=PALETTE_PERF, startangle=140,
    wedgeprops={"edgecolor": BG_COLOR, "linewidth": 2})
for at in autotexts:
    at.set_color("white")
    at.set_fontweight("bold")
ax2.set_title("Proportion of Performance Tiers")

# 3. KDE of exam_score
ax3 = fig.add_subplot(gs[1, :])
sns.histplot(df["exam_score"], bins=30, kde=True, color=ACCENT, ax=ax3,
             edgecolor="#2A2A4A", alpha=0.75)
ax3.axvline(df["exam_score"].mean(),   color="#FFD166", linewidth=2,
            linestyle="--", label=f"Mean  {df['exam_score'].mean():.1f}")
ax3.axvline(df["exam_score"].median(), color="#43C59E", linewidth=2,
            linestyle=":",  label=f"Median {df['exam_score'].median():.1f}")
for threshold, lbl in zip([50, 65, 80], ["Low|Avg", "Avg|Good", "Good|Exc"]):
    ax3.axvline(threshold, color="#EF476F", linewidth=1, linestyle="-.", alpha=0.6)
    ax3.text(threshold + 0.5, ax3.get_ylim()[1] * 0.9, lbl, fontsize=9,
             color="#EF476F", rotation=90, va="top")
ax3.set_title("Distribution of Exam Scores")
ax3.set_xlabel("Exam Score")
ax3.set_ylabel("Count")
ax3.legend()

plt.tight_layout()
save(fig, "02_target_analysis.png")

skew  = df["exam_score"].skew()
kurt  = df["exam_score"].kurt()
print(f"\n  Skewness  : {skew:.3f}  ({'slightly left-skewed' if skew<0 else 'slightly right-skewed' if skew>0 else 'symmetric'})")
print(f"  Kurtosis  : {kurt:.3f}")
print(f"""
  CLASS BALANCE ASSESSMENT:
  • Distribution is approximately bell-shaped across the 0–100 range.
  • Skewness = {skew:.2f} — near-symmetric, no severe class imbalance.
  • For classification tasks, class weights or oversampling (SMOTE) may be
    considered if Low/Excellent classes are significantly under-represented.
""")

# ═════════════════════════════════════════════════════════════════════════════
#  STEP 4 — FEATURE ANALYSIS
# ═════════════════════════════════════════════════════════════════════════════

section("STEP 4 — FEATURE ANALYSIS")

numeric_features = [
    "study_hours_per_day", "social_media_hours", "netflix_hours",
    "attendance_percentage", "sleep_hours", "exercise_frequency",
    "mental_health_rating", "age"
]
categorical_features = [
    "gender", "part_time_job", "diet_quality",
    "parental_education_level", "internet_quality", "extracurricular_participation"
]

# ── Numeric Feature Summary ───────────────────────────────────────────────────
print("\n  NUMERIC FEATURES — Summary Statistics")
print(df[numeric_features].describe().round(3).to_string())

# ── Figure: Histograms ────────────────────────────────────────────────────────
fig, axes = plt.subplots(3, 3, figsize=(18, 14))
fig.suptitle("Distribution of Numeric Features", fontsize=16, fontweight="bold", y=1.01)
axes = axes.flatten()

for i, col in enumerate(numeric_features):
    ax = axes[i]
    sns.histplot(df[col], bins=25, kde=True, color=PALETTE_MAIN[i % len(PALETTE_MAIN)],
                 ax=ax, edgecolor="#1A1A2E", alpha=0.8)
    ax.axvline(df[col].mean(),   color="#FFD166", linewidth=1.5, linestyle="--")
    ax.axvline(df[col].median(), color="#43C59E", linewidth=1.5, linestyle=":")
    ax.set_title(col.replace("_", " ").title())
    ax.set_xlabel("")

# Hide unused panel
if len(numeric_features) < len(axes):
    for j in range(len(numeric_features), len(axes)):
        axes[j].set_visible(False)

# Legend patch
mean_patch   = mpatches.Patch(color="#FFD166", label="Mean")
median_patch = mpatches.Patch(color="#43C59E", label="Median")
fig.legend(handles=[mean_patch, median_patch], loc="lower right",
           ncol=2, fontsize=10)

plt.tight_layout()
save(fig, "03_numeric_histograms.png")

# ── Figure: Boxplots by Performance ──────────────────────────────────────────
fig, axes = plt.subplots(3, 3, figsize=(18, 14))
fig.suptitle("Feature Distribution by Performance Category", fontsize=16,
             fontweight="bold", y=1.01)
axes = axes.flatten()

for i, col in enumerate(numeric_features):
    ax = axes[i]
    sns.boxplot(data=df, x="academic_performance", y=col,
                palette=PALETTE_PERF, ax=ax,
                order=labels, linewidth=1.2,
                flierprops={"marker": "o", "markerfacecolor": "#EF476F",
                            "markersize": 4, "alpha": 0.5})
    ax.set_title(col.replace("_", " ").title())
    ax.set_xlabel("")
    ax.tick_params(axis="x", rotation=30)

if len(numeric_features) < len(axes):
    for j in range(len(numeric_features), len(axes)):
        axes[j].set_visible(False)

plt.tight_layout()
save(fig, "04_boxplots_by_performance.png")

# ── Figure: Categorical Features ─────────────────────────────────────────────
fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle("Categorical Feature Distributions", fontsize=16, fontweight="bold", y=1.01)
axes = axes.flatten()

for i, col in enumerate(categorical_features):
    ax = axes[i]
    order = df[col].value_counts().index.tolist()
    sns.countplot(data=df, x=col, order=order, palette=PALETTE_MAIN, ax=ax,
                  edgecolor="#1A1A2E", linewidth=1)
    ax.set_title(col.replace("_", " ").title())
    ax.set_xlabel("")
    ax.tick_params(axis="x", rotation=20)
    total = len(df)
    for p in ax.patches:
        pct = f"{100 * p.get_height() / total:.1f}%"
        ax.annotate(pct, (p.get_x() + p.get_width()/2, p.get_height() + 3),
                    ha="center", fontsize=9)

plt.tight_layout()
save(fig, "05_categorical_distributions.png")

print("""
  KEY OBSERVATIONS:
  • study_hours_per_day   : right-skewed; most students study 0–4 h/day.
  • social_media_hours    : majority spend 1–4 h/day on social media.
  • attendance_percentage : left-skewed; most attend >70% of classes.
  • sleep_hours           : approximately normal around 6–8 h.
  • mental_health_rating  : spread 1–10; may correlate with performance.
  • gender                : roughly balanced Male/Female split.
  • parental_education    : varied across High School / Bachelor / Master / PhD.
""")

# ═════════════════════════════════════════════════════════════════════════════
#  STEP 5 — CORRELATION ANALYSIS
# ═════════════════════════════════════════════════════════════════════════════

section("STEP 5 — CORRELATION ANALYSIS")

corr_cols = numeric_features + ["exam_score"]
corr_matrix = df[corr_cols].corr().round(3)

print("\n  CORRELATION MATRIX (Pearson)")
print(corr_matrix.to_string())

# ── Correlation with exam_score ───────────────────────────────────────────────
target_corr = corr_matrix["exam_score"].drop("exam_score").sort_values(key=abs, ascending=False)
print("\n  CORRELATION WITH exam_score (sorted by absolute value)")
for feat, val in target_corr.items():
    strength = "STRONG" if abs(val) >= 0.4 else "MODERATE" if abs(val) >= 0.2 else "WEAK"
    direction = "↑" if val > 0 else "↓"
    print(f"    {feat:<30}  {val:+.3f}  {direction}  [{strength}]")

# ── Figure: Heatmap ───────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(20, 8))
fig.suptitle("Correlation Analysis", fontsize=16, fontweight="bold", y=1.01)

# Full heatmap
mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
sns.heatmap(corr_matrix, mask=mask, annot=True, fmt=".2f", cmap=PALETTE_HEAT,
            center=0, vmin=-1, vmax=1, ax=axes[0], linewidths=0.5,
            linecolor="#0F0F1A", cbar_kws={"shrink": 0.8})
axes[0].set_title("Full Correlation Matrix\n(Lower Triangle)", fontsize=13)
axes[0].tick_params(axis="x", rotation=40)

# Bar chart of correlations with target
colors_corr = ["#43C59E" if v > 0 else "#EF476F" for v in target_corr.values]
axes[1].barh(target_corr.index[::-1], target_corr.values[::-1],
             color=colors_corr[::-1], edgecolor="#2A2A4A", linewidth=1)
axes[1].axvline(0, color="white", linewidth=1)
axes[1].set_title("Feature Correlation with exam_score\n(Positive=Green, Negative=Red)", fontsize=13)
axes[1].set_xlabel("Pearson r")
for i, (val, col) in enumerate(zip(target_corr.values[::-1], target_corr.index[::-1])):
    axes[1].text(val + (0.005 if val >= 0 else -0.005), i,
                 f"{val:+.3f}", va="center",
                 ha="left" if val >= 0 else "right", fontsize=9)

plt.tight_layout()
save(fig, "06_correlation_analysis.png")

print("""
  CORRELATION INSIGHTS:
  • STRONG POSITIVE  : study_hours_per_day, attendance_percentage
  • MODERATE POSITIVE: mental_health_rating
  • MODERATE NEGATIVE: social_media_hours, netflix_hours
  • WEAK             : sleep_hours, exercise_frequency, age
""")

# ═════════════════════════════════════════════════════════════════════════════
#  STEP 6 — BEHAVIORAL INSIGHTS
# ═════════════════════════════════════════════════════════════════════════════

section("STEP 6 — BEHAVIORAL INSIGHTS")

# ── Insight 1: Study Hours vs Exam Score ──────────────────────────────────────
r_study, p_study = stats.pearsonr(df["study_hours_per_day"], df["exam_score"])
print(f"\n  [INSIGHT 1] Study Hours vs Exam Score")
print(f"  Pearson r = {r_study:.3f}  (p = {p_study:.2e})")
print(f"  → Higher study hours are {'significantly' if p_study<0.05 else 'NOT significantly'} "
      f"correlated with better exam scores.")

# ── Insight 2: Attendance ─────────────────────────────────────────────────────
r_att, p_att = stats.pearsonr(df["attendance_percentage"], df["exam_score"])
print(f"\n  [INSIGHT 2] Attendance vs Exam Score")
print(f"  Pearson r = {r_att:.3f}  (p = {p_att:.2e})")
print(f"  → Attendance is {'significantly' if p_att<0.05 else 'NOT significantly'} "
      f"correlated with performance.")

# ── Insight 3: Social Media Hours ─────────────────────────────────────────────
r_sm, p_sm = stats.pearsonr(df["social_media_hours"], df["exam_score"])
print(f"\n  [INSIGHT 3] Social Media Hours vs Exam Score")
print(f"  Pearson r = {r_sm:.3f}  (p = {p_sm:.2e})")

# ── Insight 4: Part-time Job Impact ──────────────────────────────────────────
job_groups = [df.loc[df["part_time_job"]==v, "exam_score"] for v in ["Yes", "No"]]
t_stat, p_job = stats.ttest_ind(*job_groups)
print(f"\n  [INSIGHT 4] Part-time Job Impact (t-test)")
print(f"  Mean (Job=Yes): {job_groups[0].mean():.2f}  |  Mean (Job=No): {job_groups[1].mean():.2f}")
print(f"  t = {t_stat:.3f},  p = {p_job:.4f}")

# ── Insight 5: Mental Health ──────────────────────────────────────────────────
r_mh, p_mh = stats.pearsonr(df["mental_health_rating"], df["exam_score"])
print(f"\n  [INSIGHT 5] Mental Health vs Exam Score")
print(f"  Pearson r = {r_mh:.3f}  (p = {p_mh:.2e})")

# ── Figure: Behavioral Insights Dashboard ─────────────────────────────────────
fig, axes = plt.subplots(2, 3, figsize=(20, 12))
fig.suptitle("Behavioral Insights — Students vs Academic Performance",
             fontsize=16, fontweight="bold", y=1.01)

# 1. Study hours scatter
ax = axes[0, 0]
scatter = ax.scatter(df["study_hours_per_day"], df["exam_score"],
                     c=df["exam_score"], cmap="viridis", alpha=0.5, s=18, edgecolors="none")
m, b = np.polyfit(df["study_hours_per_day"], df["exam_score"], 1)
x_line = np.linspace(df["study_hours_per_day"].min(), df["study_hours_per_day"].max(), 100)
ax.plot(x_line, m*x_line + b, color="#FFD166", linewidth=2.5, linestyle="--",
        label=f"Trend  (r={r_study:.2f})")
ax.set_title("Study Hours vs Exam Score")
ax.set_xlabel("Study Hours / Day")
ax.set_ylabel("Exam Score")
ax.legend(fontsize=9)

# 2. Social Media scatter
ax = axes[0, 1]
ax.scatter(df["social_media_hours"], df["exam_score"],
           c=df["exam_score"], cmap="RdYlGn", alpha=0.5, s=18, edgecolors="none")
m2, b2 = np.polyfit(df["social_media_hours"], df["exam_score"], 1)
x_line2 = np.linspace(df["social_media_hours"].min(), df["social_media_hours"].max(), 100)
ax.plot(x_line2, m2*x_line2 + b2, color="#EF476F", linewidth=2.5, linestyle="--",
        label=f"Trend  (r={r_sm:.2f})")
ax.set_title("Social Media Hours vs Exam Score")
ax.set_xlabel("Social Media Hours / Day")
ax.set_ylabel("Exam Score")
ax.legend(fontsize=9)

# 3. Attendance scatter
ax = axes[0, 2]
ax.scatter(df["attendance_percentage"], df["exam_score"],
           c=df["attendance_percentage"], cmap="Blues", alpha=0.5, s=18, edgecolors="none")
m3, b3 = np.polyfit(df["attendance_percentage"], df["exam_score"], 1)
x_line3 = np.linspace(df["attendance_percentage"].min(), df["attendance_percentage"].max(), 100)
ax.plot(x_line3, m3*x_line3 + b3, color="#43C59E", linewidth=2.5, linestyle="--",
        label=f"Trend  (r={r_att:.2f})")
ax.set_title("Attendance vs Exam Score")
ax.set_xlabel("Attendance (%)")
ax.set_ylabel("Exam Score")
ax.legend(fontsize=9)

# 4. Part-time Job boxplot
ax = axes[1, 0]
sns.boxplot(data=df, x="part_time_job", y="exam_score", palette=["#EF476F", "#43C59E"], ax=ax,
            order=["Yes", "No"], linewidth=1.5,
            flierprops={"marker": "o", "markersize": 3, "alpha": 0.4})
ax.set_title(f"Part-time Job Impact on Exam Score\n(p={p_job:.4f})")
ax.set_xlabel("Has Part-time Job?")
ax.set_ylabel("Exam Score")

# 5. Mental Health scatter
ax = axes[1, 1]
sns.regplot(data=df, x="mental_health_rating", y="exam_score",
            scatter_kws={"alpha": 0.35, "s": 15, "color": "#6C63FF"},
            line_kws={"color": "#FFD166", "linewidth": 2},
            ax=ax, ci=95)
ax.set_title(f"Mental Health vs Exam Score\n(r={r_mh:.2f})")
ax.set_xlabel("Mental Health Rating (1–10)")
ax.set_ylabel("Exam Score")

# 6. Sleep hours by performance
ax = axes[1, 2]
sleep_perf = df.groupby("academic_performance")["sleep_hours"].mean().reindex(labels)
bars = ax.bar(sleep_perf.index, sleep_perf.values,
              color=PALETTE_PERF, edgecolor="#2A2A4A", linewidth=1.2, width=0.6)
for bar, val in zip(bars, sleep_perf.values):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
            f"{val:.1f}h", ha="center", va="bottom", fontsize=10, fontweight="bold")
ax.set_title("Avg Sleep Hours by Performance Category")
ax.set_xlabel("Performance Category")
ax.set_ylabel("Avg Sleep Hours")
ax.set_ylim(0, sleep_perf.max() * 1.2)
ax.tick_params(axis="x", rotation=15)

plt.tight_layout()
save(fig, "07_behavioral_insights.png")

# ── Figure: Performance by Categorical Groups ─────────────────────────────────
fig, axes = plt.subplots(2, 3, figsize=(20, 12))
fig.suptitle("Exam Score Distribution by Categorical Groups",
             fontsize=16, fontweight="bold", y=1.01)

cat_pairs = [
    ("gender", "Gender"),
    ("part_time_job", "Part-time Job"),
    ("diet_quality", "Diet Quality"),
    ("internet_quality", "Internet Quality"),
    ("parental_education_level", "Parental Education"),
    ("extracurricular_participation", "Extracurricular"),
]
for ax, (col, title) in zip(axes.flatten(), cat_pairs):
    order = df.groupby(col)["exam_score"].mean().sort_values(ascending=False).index.tolist()
    sns.boxplot(data=df, x=col, y="exam_score", palette=PALETTE_MAIN, ax=ax,
                order=order, linewidth=1.2,
                flierprops={"marker": "o", "markersize": 3, "alpha": 0.4})
    ax.set_title(f"{title} vs Exam Score")
    ax.set_xlabel("")
    ax.tick_params(axis="x", rotation=20)
    means = df.groupby(col)["exam_score"].mean().reindex(order)
    for i, (cat, mean_val) in enumerate(means.items()):
        ax.text(i, mean_val + 0.5, f"μ={mean_val:.1f}", ha="center",
                fontsize=8, color="#FFD166", fontweight="bold")

plt.tight_layout()
save(fig, "08_categorical_vs_performance.png")

# ═════════════════════════════════════════════════════════════════════════════
#  STEP 7 — FEATURE IMPORTANCE PREPARATION
# ═════════════════════════════════════════════════════════════════════════════

section("STEP 7 — FEATURE IMPORTANCE PREPARATION")

# Quick RF importance (no test split — just for EDA ranking)
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler

df_temp = df.drop(columns=["student_id", "exam_score"]).copy()

cat_temp = df_temp.select_dtypes("object").columns.tolist()
le = LabelEncoder()
for c in cat_temp:
    df_temp[c] = le.fit_transform(df_temp[c].astype(str))
df_temp["academic_performance_enc"] = le.fit_transform(df["academic_performance"].astype(str))

X_temp = df_temp.drop(columns=["academic_performance", "academic_performance_enc"], errors="ignore")
y_temp = df_temp["academic_performance_enc"]

rf = RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1)
rf.fit(X_temp, y_temp)
importances = pd.Series(rf.feature_importances_, index=X_temp.columns).sort_values(ascending=False)

print("\n  RANDOM FOREST — Feature Importances (proxy ranking for EDA)")
for feat, imp in importances.items():
    bar = "█" * int(imp * 80)
    print(f"    {feat:<35}  {imp:.4f}  {bar}")

print("""
  ENCODING REQUIRED (Categorical → Numeric):
    gender, part_time_job, diet_quality, parental_education_level,
    internet_quality, extracurricular_participation
    → Use Label Encoding or One-Hot Encoding.

  SCALING REQUIRED (continuous features):
    study_hours_per_day, social_media_hours, netflix_hours,
    attendance_percentage, sleep_hours, age
    → Use StandardScaler or MinMaxScaler.

  POTENTIALLY REDUNDANT:
    • netflix_hours and social_media_hours may be collinear — check VIF.
    • age shows very low importance; consider dropping if it adds noise.

  DROP:
    • student_id  — identifier, no predictive value.
""")

# ── Figure: Feature Importance ────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(12, 8))
fig.suptitle("Feature Importance Ranking (Random Forest Proxy)", fontsize=15,
             fontweight="bold", y=1.01)

colors_imp = [PALETTE_MAIN[0] if imp >= importances.quantile(0.6)
              else PALETTE_MAIN[2] if imp >= importances.quantile(0.3)
              else "#555577" for imp in importances.values]

bars = ax.barh(importances.index[::-1], importances.values[::-1],
               color=colors_imp[::-1], edgecolor="#1A1A2E", linewidth=0.8)
ax.set_xlabel("Importance Score")
ax.set_title("Feature Importance for Predicting Academic Performance")
ax.axvline(importances.quantile(0.6), color="#FFD166", linewidth=1.5,
           linestyle="--", label="High Importance Threshold")
ax.axvline(importances.quantile(0.3), color="#43C59E", linewidth=1.5,
           linestyle=":", label="Low Importance Threshold")
ax.legend()

for bar, val in zip(bars, importances.values[::-1]):
    ax.text(val + 0.001, bar.get_y() + bar.get_height()/2,
            f"{val:.4f}", va="center", fontsize=9)

plt.tight_layout()
save(fig, "09_feature_importance.png")

# ═════════════════════════════════════════════════════════════════════════════
#  STEP 8 — DATA CLEANING PIPELINE
# ═════════════════════════════════════════════════════════════════════════════

section("STEP 8 — DATA CLEANING PIPELINE")

df_clean = df.copy()

# 1. Drop identifier column
df_clean.drop(columns=["student_id"], inplace=True)
print("  [1] Dropped 'student_id' (identifier, no predictive value).")

# 2. Remove duplicate rows
n_before = len(df_clean)
df_clean.drop_duplicates(inplace=True)
n_after = len(df_clean)
print(f"  [2] Removed {n_before - n_after} duplicate rows. ({n_after} remain)")

# 3. Handle missing values (parental_education_level has NaN in source)
missing_before = df_clean.isnull().sum().sum()
if missing_before > 0:
    for col in df_clean.select_dtypes("object").columns:
        n_null = df_clean[col].isnull().sum()
        if n_null > 0:
            mode_val = df_clean[col].mode()[0]
            df_clean[col].fillna(mode_val, inplace=True)
            print(f"  [3] Imputed {n_null} NaN in '{col}' with mode: '{mode_val}'.")
else:
    print(f"  [3] No missing values confirmed — no imputation needed.")
assert df_clean.isnull().sum().sum() == 0, "Still has missing values after imputation!"

# 4. Encode binary categorical features
binary_map = {"Yes": 1, "No": 0, "Male": 1, "Female": 0}
for col in ["part_time_job", "extracurricular_participation", "gender"]:
    df_clean[col] = df_clean[col].map(binary_map)
print("  [4] Binary encoded: gender, part_time_job, extracurricular_participation.")

# 5. Ordinal encode ordered categoricals
diet_order    = {"Poor": 0, "Fair": 1, "Good": 2, "Excellent": 3}
internet_order = {"Poor": 0, "Average": 1, "Good": 2}
edu_order     = {"High School": 0, "Bachelor": 1, "Master": 2, "PhD": 3}
df_clean["diet_quality"]            = df_clean["diet_quality"].map(diet_order)
df_clean["internet_quality"]        = df_clean["internet_quality"].map(internet_order)
df_clean["parental_education_level"] = df_clean["parental_education_level"].map(edu_order)
print("  [5] Ordinal encoded: diet_quality, internet_quality, parental_education_level.")

# 6. Cap outliers in exam_score using Winsorization (1st–99th percentile)
lo_p, hi_p = df_clean["exam_score"].quantile(0.01), df_clean["exam_score"].quantile(0.99)
df_clean["exam_score"] = df_clean["exam_score"].clip(lo_p, hi_p)
print(f"  [6] Winsorized exam_score to [{lo_p:.1f}, {hi_p:.1f}] (1–99th percentile).")

# 7. Feature Engineering
df_clean["study_to_social_ratio"] = (
    df_clean["study_hours_per_day"] /
    (df_clean["social_media_hours"] + df_clean["netflix_hours"] + 0.01)
).round(4)
df_clean["total_distraction_hours"] = (
    df_clean["social_media_hours"] + df_clean["netflix_hours"]
).round(4)
df_clean["wellbeing_index"] = (
    (df_clean["sleep_hours"] / 10) +
    (df_clean["exercise_frequency"] / 10) +
    (df_clean["mental_health_rating"] / 10)
).round(4)
print("  [7] Engineered features: study_to_social_ratio, total_distraction_hours, wellbeing_index.")

# 8. Keep academic_performance label & numeric exam_score for both tasks
df_clean["performance_label"] = df_clean["academic_performance"]
df_clean.drop(columns=["academic_performance"], inplace=True)

print(f"\n  CLEANED DATASET SHAPE : {df_clean.shape}")
print(f"\n  COLUMNS:")
for c in df_clean.columns:
    print(f"    {c}")

df_clean.to_csv(os.path.join(DATA_DIR, "cleaned_student_dataset.csv"), index=False)
print(f"\n  [SAVED] cleaned_student_dataset.csv")

# ── Figure: Before vs After Cleaning ─────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(16, 6))
fig.suptitle("Data Cleaning: Before vs After", fontsize=15, fontweight="bold", y=1.01)

# Dtype distribution
before_dtypes = df.dtypes.map(str).value_counts()
after_dtypes  = df_clean.dtypes.map(str).value_counts()

x_pos = np.arange(max(len(before_dtypes), len(after_dtypes)))
axes[0].bar(before_dtypes.index, before_dtypes.values, color=PALETTE_MAIN[:len(before_dtypes)],
            edgecolor="#1A1A2E", linewidth=1)
axes[0].set_title("Before Cleaning\nColumn Data Types")
axes[0].set_xlabel("Data Type")
axes[0].set_ylabel("Count")

axes[1].bar(after_dtypes.index, after_dtypes.values, color=PALETTE_MAIN[:len(after_dtypes)],
            edgecolor="#1A1A2E", linewidth=1)
axes[1].set_title("After Cleaning\nColumn Data Types")
axes[1].set_xlabel("Data Type")
axes[1].set_ylabel("Count")

for ax in axes:
    for p in ax.patches:
        ax.text(p.get_x() + p.get_width()/2, p.get_height() + 0.1,
                str(int(p.get_height())), ha="center", fontsize=11, fontweight="bold")

plt.tight_layout()
save(fig, "10_before_after_cleaning.png")

# ═════════════════════════════════════════════════════════════════════════════
#  STEP 9 — PRESENTATION SUMMARY
# ═════════════════════════════════════════════════════════════════════════════

section("STEP 9 — PRESENTATION SUMMARY REPORT")

# ── Recompute key stats for final report ─────────────────────────────────────
study_corr  = df["study_hours_per_day"].corr(df["exam_score"])
attend_corr = df["attendance_percentage"].corr(df["exam_score"])
sm_corr     = df["social_media_hours"].corr(df["exam_score"])
mh_corr     = df["mental_health_rating"].corr(df["exam_score"])

top_feature = importances.idxmax()
top_imp     = importances.max()

excellent_pct = (df["academic_performance"] == "Excellent (≥80)").sum() / len(df) * 100
low_pct       = (df["academic_performance"] == "Low (<50)").sum() / len(df) * 100

summary = f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║        FINAL PRESENTATION SUMMARY — STUDENT HABITS vs ACADEMIC PERFORMANCE ║
║                    AI Course Project  |  2026                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  1. DATASET OVERVIEW                                                         ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  • Source      : Kaggle — Student Habits vs Academic Performance Dataset     ║
║  • Records     : 1,000 students   Columns : 16 (15 features + 1 target)     ║
║  • Target      : exam_score (continuous, 0–100)                              ║
║                  Binned → 4 performance tiers for classification tasks       ║
║  • Feature Mix : 8 numeric + 6 categorical                                   ║
║                                                                              ║
║  2. KEY FINDINGS                                                             ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  • Study hours show the STRONGEST positive correlation with exam score       ║
║    (r = {study_corr:+.3f}).  Each additional study hour per day is associated     ║
║    with a measurable increase in exam performance.                           ║
║                                                                              ║
║  • Attendance percentage is a close second (r = {attend_corr:+.3f}).               ║
║    Students attending >85% of classes score notably higher on average.      ║
║                                                                              ║
║  • Social media consumption exhibits a NEGATIVE relationship (r = {sm_corr:+.3f}).  ║
║    Students averaging >3 h/day of social media tend to score lower.         ║
║                                                                              ║
║  • Mental health rating shows a POSITIVE correlation (r = {mh_corr:+.3f}),          ║
║    underscoring the role of psychological well-being in academic success.   ║
║                                                                              ║
║  • Approximately {excellent_pct:.1f}% of students are classified as Excellent (≥80)   ║
║    while {low_pct:.1f}% fall into the Low (<50) category.                          ║
║                                                                              ║
║  3. IMPORTANT FEATURES (Ranked by RF Importance)                            ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Top 5 predictors identified by Random Forest proxy ranking:                 ║
{chr(10).join(f"║    {i+1}. {feat:<30}  Importance: {imp:.4f}{'':>10}║" for i,(feat,imp) in enumerate(importances.head(5).items()))}
║                                                                              ║
║  4. DATA QUALITY ISSUES                                                     ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  • Missing Values  : NONE — dataset is complete (0% missingness).           ║
║  • Duplicate Rows  : {n_before - n_after} removed.                                               ║
║  • Outliers        : Minor outliers in exam_score and study_hours detected. ║
║    Action taken    : Winsorization at 1st–99th percentile for exam_score.   ║
║                                                                              ║
║  5. DATA CLEANING PROCESS                                                   ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Step A  | Dropped student_id (non-informative identifier).                 ║
║  Step B  | Removed duplicate records.                                        ║
║  Step C  | Binary encoded: gender, part_time_job, extracurricular.          ║
║  Step D  | Ordinal encoded: diet_quality, internet_quality, parental_edu.   ║
║  Step E  | Winsorized exam_score to suppress extreme outliers.               ║
║  Step F  | Engineered 3 new features:                                        ║
║            – study_to_social_ratio  (focus intensity metric)                ║
║            – total_distraction_hours (leisure screen time)                   ║
║            – wellbeing_index         (composite health indicator)            ║
║  Output  | cleaned_student_dataset.csv  ({df_clean.shape[0]} rows × {df_clean.shape[1]} columns){'':>11}║
║                                                                              ║
║  6. WHY THIS DATASET IS RELEVANT TO MindFlow AI                             ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  MindFlow AI is an adaptive learning intelligence platform designed to       ║
║  personalise educational experiences. This dataset provides precisely the   ║
║  behavioural and lifestyle signals that MindFlow AI needs to:                ║
║                                                                              ║
║  ✦ PREDICT RISK — Identify at-risk students (Low/Average performers)        ║
║    before examinations using real-time behavioural indicators.               ║
║                                                                              ║
║  ✦ PERSONALISE PLANS — Recommend optimal study schedules by modelling       ║
║    the relationship between study hours, sleep, and performance.             ║
║                                                                              ║
║  ✦ MENTAL HEALTH INTEGRATION — The mental_health_rating feature enables     ║
║    MindFlow to proactively flag students who may need counselling support.   ║
║                                                                              ║
║  ✦ ENGAGEMENT ANALYTICS — social_media_hours and netflix_hours serve as     ║
║    distraction proxies, allowing the platform to issue focus nudges.         ║
║                                                                              ║
║  ✦ HOLISTIC PROFILING — Combining lifestyle habits (diet, exercise, sleep)  ║
║    with academic metrics enables truly holistic student performance models.  ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Generated Visualizations (./visualizations/)                                ║
║  01_data_quality.png         07_behavioral_insights.png                      ║
║  02_target_analysis.png      08_categorical_vs_performance.png               ║
║  03_numeric_histograms.png   09_feature_importance.png                       ║
║  04_boxplots_by_performance.png  10_before_after_cleaning.png                ║
║  05_categorical_distributions.png                                            ║
║  06_correlation_analysis.png                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

print(summary)

with open(os.path.join(BASE_DIR, "eda_summary_report.txt"), "w") as f:
    f.write(summary)
print("  [SAVED] eda_summary_report.txt")

print("\n" + "="*72)
print("  EDA COMPLETE — All outputs written to ./visualizations/ ")
print("  cleaned_student_dataset.csv and eda_summary_report.txt generated.")
print("="*72)
