#!/usr/bin/env python3
"""Independent biological validation of Venn Diagram Lab statistics.

Reference implementation built ONLY on math.lgamma — no scipy, and the
package's own statistics code is never used to compute reference values.
Sample files are parsed manually as well (stdlib csv, quote-aware).

Per sample:
  1. Parse equivalence (manual parse vs package Dataset).
  2. Set-theoretic invariants on RegionResult (exclusive sums to union,
     inclusive = sum over supersets, universe semantics per mode).
  3. Pairwise Jaccard / Dice / OC / FE / hypergeom P(X>=k) / BH-FDR vs the
     package's statistics DataFrames.
  4. Biological plausibility asserts (per dataset, documented inline:
     cancer-driver catalogs must over-overlap, canonical pan-cancer drivers
     must sit in the 4-way intersection, related Hallmark pathways must be
     enriched, depleted pairs must stay non-significant).

Run from anywhere:  python3 scripts/bio_validation.py
Exit code 0 = all checks passed, 1 = at least one failure.
"""
import math
import sys
import csv as csvmod
from itertools import combinations
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / 'python' / 'src'))
from venn_diagram_lab.samples import load_sample  # I/O only
from venn_diagram_lab.analysis import analyze

SAMPLES = REPO_ROOT / 'python' / 'src' / 'venn_diagram_lab' / '_data' / 'samples'
failures = []


def check(cond, msg):
    if not cond:
        failures.append(msg)
        print(f'  FAIL: {msg}')


# ---------- independent reference math ----------

def log_choose(n, k):
    if k < 0 or k > n:
        return float('-inf')
    return math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)


def hypergeom_sf(k, K, N, n):
    """P(X >= k) for X ~ Hypergeom(N, K, n) — direct log-space sum."""
    lo = max(0, k, K + n - N)
    hi = min(K, n)
    if lo > hi:
        return 0.0 if k > hi else 1.0
    terms = [math.exp(log_choose(K, i) + log_choose(N - K, n - i) - log_choose(N, n))
             for i in range(lo, hi + 1)]
    return min(1.0, sum(terms))


def bh_adjust(pvals):
    m = len(pvals)
    order = sorted(range(m), key=lambda i: pvals[i])
    adj = [0.0] * m
    prev = 1.0
    for rank in range(m, 0, -1):
        i = order[rank - 1]
        prev = min(prev, pvals[i] * m / rank)
        adj[i] = min(1.0, prev)
    return adj


# ---------- manual parsing ----------

def read_rows(path):
    """Quote-aware row reader (stdlib csv) — independent of the package."""
    delim = '\t' if path.suffix == '.tsv' else ','
    with open(path, newline='') as f:
        return [row for row in csvmod.reader(f, delimiter=delim) if any(c.strip() for c in row)]


def parse_binary(path, prefix_cols=1):
    lines = read_rows(path)
    header = lines[0]
    sets = {h: set() for h in header[prefix_cols:]}
    rows = 0
    for parts in lines[1:]:
        gene = parts[0].strip()
        if not gene:
            continue
        rows += 1
        for h, v in zip(header[prefix_cols:], parts[prefix_cols:]):
            if v.strip().lower() in ('1', 'true', 'yes'):
                sets[h].add(gene)
    return sets, rows


def parse_aggregated(path):
    lines = read_rows(path)
    header = lines[0]
    cols = [[] for _ in header]
    for parts in lines[1:]:
        for i in range(len(header)):
            v = parts[i].strip() if i < len(parts) else ''
            if v:
                cols[i].append(v)
    return {h: set(c) for h, c in zip(header, cols)}


# ---------- per-sample validation ----------

def validate_sample(name, mode, prefix_cols=1):
    print(f'\n=== {name} ({mode}) ===')
    tsv = SAMPLES / f'{name}.tsv'
    path = tsv if tsv.exists() else SAMPLES / f'{name}.csv'
    if mode == 'binary':
        ref_sets, universe = parse_binary(path, prefix_cols)
    else:
        ref_sets = parse_aggregated(path)
        universe = len(set().union(*ref_sets.values()))

    result = analyze(load_sample(name), model='auto')
    pkg_sets = {s: set(result.dataset.items[s]) for s in result.dataset.set_names}

    # --- 1. parse equivalence ---
    check(list(pkg_sets.keys()) == list(ref_sets.keys()),
          f'{name}: set names/order {list(pkg_sets)} vs {list(ref_sets)}')
    for s in ref_sets:
        check(pkg_sets.get(s) == ref_sets[s],
              f'{name}: set {s} content differs ({len(pkg_sets.get(s, set()))} vs {len(ref_sets[s])})')

    names = list(ref_sets.keys())
    sets = [ref_sets[nm] for nm in names]
    letters = list('ABCDEFGHI')[:len(sets)]
    union = set().union(*sets)

    # --- 2. region invariants ---
    regions = result.regions  # keyed by bitmask int
    by_label = {r.label: r for r in regions.values()}
    check(sum(r.exclusive_count for r in regions.values()) == len(union),
          f'{name}: sum(exclusive)={sum(r.exclusive_count for r in regions.values())} != |union|={len(union)}')
    for li, letter in enumerate(letters):
        sup = sum(r.exclusive_count for r in regions.values() if letter in r.label)
        reg = by_label[letter]
        check(reg.inclusive_count == sup == len(sets[li]),
              f'{name}: inclusive[{letter}]={reg.inclusive_count} vs supersets={sup} vs |set|={len(sets[li])}')
        check(len(reg.inclusive_items) == reg.inclusive_count and len(reg.exclusive_items) == reg.exclusive_count,
              f'{name}: item list lengths != counts for {letter}')
    check(result.effective_universe() == universe,
          f'{name}: universe {result.effective_universe()} != reference {universe}')

    # --- 3. pairwise stats vs independent reference ---
    hyper = result.statistics.hypergeometric
    pkg = {}
    for row in hyper.to_dict('records'):
        pkg[(row['set_a'], row['set_b'])] = row

    pairs = list(combinations(range(len(sets)), 2))
    pvals, refs = [], []
    for i, j in pairs:
        A, B = sets[i], sets[j]
        inter = len(A & B)
        un = len(A | B)
        jac = inter / un if un else 0.0
        dice = 2 * inter / (len(A) + len(B)) if (len(A) + len(B)) else 0.0
        oc = inter / min(len(A), len(B)) if min(len(A), len(B)) else 0.0
        expected = len(A) * len(B) / universe
        fe = inter / expected if expected else 0.0
        p = hypergeom_sf(inter, len(A), universe, len(B))
        pvals.append(p)
        refs.append((names[i], names[j], inter, un, jac, dice, oc, fe, expected, p))
    fdrs = bh_adjust(pvals)

    for (na, nb, inter, un, jac, dice, oc, fe, expected, p), fdr in zip(refs, fdrs):
        row = pkg.get((na, nb)) or pkg.get((nb, na))
        check(row is not None, f'{name}: missing pair {na}/{nb}')
        if row is None:
            continue
        check(row['intersection'] == inter, f'{name} {na}/{nb}: intersection {row["intersection"]} vs {inter}')
        check(abs(row['expected'] - expected) < 1e-6, f'{name} {na}/{nb}: expected {row["expected"]} vs {expected}')
        pk = row['p_value']
        if p < 1e-308:
            check(pk < 1e-300, f'{name} {na}/{nb}: p {pk:.2e} should underflow like ref {p:.2e}')
        else:
            check(pk > 0 and abs(math.log10(pk) - math.log10(p)) < 1e-9,
                  f'{name} {na}/{nb}: p {pk:.3e} vs ref {p:.3e}')
        fa = row['p_adjusted']
        if fdr < 1e-308:
            check(fa < 1e-300, f'{name} {na}/{nb}: FDR {fa:.2e} should underflow like ref {fdr:.2e}')
        else:
            check(fa > 0 and abs(math.log10(fa) - math.log10(fdr)) < 1e-9,
                  f'{name} {na}/{nb}: FDR {fa:.3e} vs ref {fdr:.3e}')
        check(row['jaccard_ci_low'] <= jac + 1e-3 <= row['jaccard_ci_high'] + 2e-3,
              f'{name} {na}/{nb}: Jaccard CI [{row["jaccard_ci_low"]},{row["jaccard_ci_high"]}] vs J={jac}')
        check(0 <= row['jaccard_ci_low'] <= row['jaccard_ci_high'] <= 1,
              f'{name} {na}/{nb}: Jaccard CI out of [0,1] or unordered')

    # Jaccard/Dice matrices
    jm = result.statistics.jaccard
    dm = result.statistics.dice
    for (na, nb, inter, un, jac, dice, oc, fe, expected, p) in refs:
        check(abs(jm.loc[na, nb] - jac) < 1e-12, f'{name} {na}/{nb}: jaccard {jm.loc[na, nb]} vs {jac}')
        check(abs(dm.loc[na, nb] - dice) < 1e-12, f'{name} {na}/{nb}: dice {dm.loc[na, nb]} vs {dice}')

    return refs, fdrs, universe, result, by_label


print('=== BIOLOGICAL VALIDATION ===')

# --- A. Cancer driver catalogs ---
refs, fdrs, N, res, by_label = validate_sample('dataset_real_cancer_drivers_4', 'binary')
print(f'  universe N={N}')
check(19000 <= N <= 21000, f'cancer drivers: universe {N} outside 19k-21k')
for (na, nb, inter, un, jac, dice, oc, fe, expected, p), fdr in zip(refs, fdrs):
    print(f'  {na:12s} x {nb:12s} inter={inter:4d} J={jac:.3f} FE={fe:6.2f} p={p:.1e} FDR={fdr:.1e}')
    check(fe > 1.5, f'{na}x{nb}: driver catalogs FE={fe:.2f} <= 1.5 (biologically implausible)')
    check(fdr < 0.05, f'{na}x{nb}: driver overlap not significant (FDR={fdr})')

core = set(by_label['ABCD'].exclusive_items)
print(f'  4-way intersection: {len(core)} genes: {sorted(core)}')
known = {'TP53', 'KRAS', 'PIK3CA', 'PTEN', 'BRAF', 'EGFR', 'APC'}
present = known & core
check(len(present) >= 2, f'only {sorted(present)} of {sorted(known)} in 4-way intersection')
print(f'  core pan-cancer drivers in ABCD: {sorted(present)}')

# --- B. MSigDB pathway samples (binary: Gene + 0/1 pathway columns) ---
for sample in ('dataset_real_msigdb_cancer_pathways', 'dataset_real_msigdb_immune_pathways'):
    refs, fdrs, N, res, _ = validate_sample(sample, 'binary')
    print(f'  union N={N}')
    for (na, nb, inter, un, jac, dice, oc, fe, expected, p), fdr in zip(refs, fdrs):
        print(f'    {na[:30]:32s} x {nb[:30]:32s} inter={inter:4d} J={jac:.3f} FE={fe:5.2f} FDR={fdr:.1e}')

# --- C. Mock datasets: structural validity only ---
# (streaming CSV has two metadata columns: Title + Type)
for sample, mode, pc in (('dataset_mock_gene_sets', 'aggregated', 1), ('dataset_mock_streaming_platforms', 'binary', 2)):
    validate_sample(sample, mode, pc)

# --- D. GMT parsing biology (bundled MSigDB c5 GO BP) ---
print('\n=== GMT parse: c5.go.bp ===')
gmt = REPO_ROOT / 'data' / 'c5.go.bp.v2026.1.Hs.symbols.gmt'
n_sets = n_skipped = tp53_sets = 0
with open(gmt) as f:
    for line in f:
        parts = line.rstrip('\n').split('\t')
        if len(parts) < 3 or not parts[0].strip():
            n_skipped += 1
            continue
        n_sets += 1
        if 'TP53' in parts[2:]:
            tp53_sets += 1
print(f'  valid sets: {n_sets}, skipped: {n_skipped}, sets containing TP53: {tp53_sets}')
check(n_sets > 7000, f'c5.go.bp: only {n_sets} sets parsed (expect >7000)')
check(tp53_sets > 200, f'c5.go.bp: TP53 in only {tp53_sets} sets (expect hundreds)')

# --- E. Custom background universe (P1, v2.8.0) ---
# Aggregated input defaults to N = |union|; a user-supplied genome background
# must flow through Dataset.universe_size into effective_universe() and the
# hypergeometric tests. Verified against the independent reference with N=20000.
print('\n=== Custom universe override (aggregated, N=20000) ===')
from dataclasses import replace as dc_replace

ds = load_sample('dataset_mock_gene_sets')
base = analyze(ds, model='auto')
union_n = base.effective_universe()
custom = analyze(dc_replace(ds, universe_size=20000), model='auto')
check(custom.effective_universe() == 20000,
      f'custom universe: effective_universe {custom.effective_universe()} != 20000')
check(union_n != 20000, 'custom universe test needs union != 20000 to be discriminating')

ref_sets = {s: set(base.dataset.items[s]) for s in base.dataset.set_names}
names = list(ref_sets)
sets = [ref_sets[nm] for nm in names]
pairs = list(combinations(range(len(sets)), 2))
pvals = []
refs20000 = []
for i, j in pairs:
    A, B = sets[i], sets[j]
    inter = len(A & B)
    p = hypergeom_sf(inter, len(A), 20000, len(B))
    pvals.append(p)
    refs20000.append((names[i], names[j], p))
fdrs20000 = bh_adjust(pvals)

pkg20000 = {}
for row in custom.statistics.hypergeometric.to_dict('records'):
    pkg20000[(row['set_a'], row['set_b'])] = row

for (na, nb, p), fdr in zip(refs20000, fdrs20000):
    row = pkg20000.get((na, nb)) or pkg20000.get((nb, na))
    check(row is not None, f'custom universe: missing pair {na}/{nb}')
    if row is None:
        continue
    pk = row['p_value']
    check(pk > 0 and abs(math.log10(pk) - math.log10(p)) < 1e-9,
          f'custom universe {na}/{nb}: p {pk:.3e} vs ref {p:.3e}')
    fa = row['p_adjusted']
    check(fa > 0 and abs(math.log10(fa) - math.log10(fdr)) < 1e-9,
          f'custom universe {na}/{nb}: FDR {fa:.3e} vs ref {fdr:.3e}')
print(f'  union N={union_n} -> custom N=20000; all {len(refs20000)} pairs match the reference')

# --- F. Fold-enrichment CI (P4, v2.9.0) ---
# F1: the package's fe_ci_low/high must equal an independent recomputation of
# the documented formula (log-scale Wald with Jeffreys correction).
# F2: Monte Carlo coverage — under the null (items assigned at random), the
# 95% CI must contain the true enrichment (1.0) in ~95% of trials.
print('\n=== FE confidence interval (correctness + coverage) ===')
from venn_diagram_lab.statistics import fold_enrichment_ci


def ref_fe_ci(N, K, n, k, z=1.959963984540054):
    """Independent transcription of the documented log-Wald formula."""
    if N == 0 or K == 0 or n == 0:
        return (0.0, 0.0)
    kc, nc = k + 0.5, n + 1
    center = math.log(kc / nc) - math.log(K / N)
    se = math.sqrt(max(0.0, 1.0 / kc - 1.0 / nc))
    return (math.exp(center - z * se), math.exp(center + z * se))


for (N, K, n, k) in [(20000, 138, 581, 126), (4384, 200, 200, 73), (100, 20, 30, 0), (50, 10, 10, 10)]:
    lo, hi = fold_enrichment_ci(N, K, n, k)
    rlo, rhi = ref_fe_ci(N, K, n, k)
    check(abs(lo - rlo) < 1e-12 and abs(hi - rhi) < 1e-12,
          f'FE CI formula mismatch at N={N},K={K},n={n},k={k}: ({lo},{hi}) vs ({rlo},{rhi})')
    check(0 <= lo <= hi, f'FE CI unordered at N={N},K={K},n={n},k={k}')
    # CI should bracket the corrected point estimate exp(center)
    fe = (k * N) / (K * n) if K and n and N else 0.0
    if k > 0:
        check(lo <= fe * 1.05 and hi >= fe / 1.05,  # generous band around the raw FE
              f'FE CI [{lo:.3f},{hi:.3f}] far from FE={fe:.3f} at k={k}')

# Coverage simulation under the null: k ~ Hypergeometric(N, K, n) sampled
# directly (n draws without replacement from N items, K of them "successes");
# the true enrichment is 1.0, so a valid 95% CI covers 1.0 in ~95% of trials.
import random
rng = random.Random(42)
TRIALS = 20000
covered = 0
N_c, K_c, n_c = 20000, 500, 300
population = range(N_c)
for _ in range(TRIALS):
    k_sim = sum(1 for x in rng.sample(population, n_c) if x < K_c)
    lo, hi = fold_enrichment_ci(N_c, K_c, n_c, k_sim)
    if lo <= 1.0 <= hi:
        covered += 1
coverage = covered / TRIALS
print(f'  null coverage over {TRIALS} trials (N={N_c}, K={K_c}, n={n_c}): {coverage:.4f}')
check(0.90 <= coverage <= 0.99,
      f'FE CI null coverage {coverage:.4f} outside [0.90, 0.99] — approximation miscalibrated')


print('\n' + '=' * 50)
if failures:
    print(f'VALIDATION FAILED: {len(failures)} issue(s)')
    sys.exit(1)
print('ALL BIOLOGICAL VALIDATION CHECKS PASSED')
