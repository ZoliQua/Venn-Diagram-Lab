# Release runbook — vennDiagramLab (R)

Operator-facing checklist for releasing the R package to CRAN and
Bioconductor and minting a Zenodo DOI. R submissions are manual (no OIDC
auto-publish like Python’s PyPI flow) — this runbook documents each
step.

The parallel doc for Python is `../python/RELEASE.md`.

## One-time setup (do this before v2.0.0)

### 1. Verify Zenodo-GitHub integration

Already enabled if `CITATION.cff::doi` is populated (currently
`10.5281/zenodo.20000599` from the v2.0.0 web/Python release).

Verify at <https://zenodo.org/account/settings/github/> that
`ZoliQua/Venn-Diagram-Lab` is toggled **ON**. From now on, every GitHub
release Zenodo sees will be archived and assigned a fresh DOI.

### 2. Bioconductor support site (one-time, already done in Phase 8)

Maintainer email `ssdbtc@gmail.com` is registered at
<https://support.bioconductor.org/> and `vennDiagramLab` is added to
Watched Tags in the maintainer profile. BiocCheck verifies this
automatically.

### 3. (Recommended) Subscribe to Bioc-Devel mailing list

<https://stat.ethz.ch/mailman/listinfo/bioc-devel> — for release-cycle
announcements + build-failure notifications. Not strictly required
(BiocCheck emits a NOTE if it cannot verify subscription, but does not
fail).

## Per-release checklist

For each R release (e.g. v2.0.0, v2.0.1, …):

### A. Pre-release verification

1.  **All 5 R CMD check CI cells green** on main (Linux
    release/devel/oldrel

    - macOS + Windows):

    ``` bash
    gh run list --workflow r-cmd-check.yml --branch main --limit 1
    ```

2.  **BiocCheck CI green** on main (now blocking after Phase 9):

    ``` bash
    gh run list --workflow r-bioc-check.yml --branch main --limit 1
    ```

3.  **pkgdown site live** at
    <https://zoliqua.github.io/Venn-Diagram-Lab/r/>.

4.  **Local R CMD check –as-cran** clean (≤1 NOTE — only “New
    submission” for v2.0.0 first submission):

    ``` bash
    cd /Users/Zoli/Code/Orthologs/2-venn-diagram
    R CMD build r
    R CMD check --as-cran vennDiagramLab_2.0.0.tar.gz | tail -10
    ```

5.  **Local BiocCheck** clean (0 ERROR / 0 WARNING):

    ``` bash
    Rscript -e 'BiocCheck::BiocCheck("vennDiagramLab_2.0.0.tar.gz")' | tail -5
    ```

### B. Bump version (if iterating past v2.0.0)

For v2.0.0 (the first R release), `r/DESCRIPTION::Version` is already
`2.0.0` — no bump needed.

For subsequent releases (v2.0.1, v2.0.2, …): 1. Edit `r/DESCRIPTION`
`Version: 2.0.X` → `Version: 2.0.Y`. 2. Add new entry to `r/NEWS.md` at
the top (under the existing v2.0.0 block). 3. Commit:
`bash cd /Users/Zoli/Code/Orthologs/2-venn-diagram git -c user.name="Zoltán Dul" -c user.email="ssdbtc@gmail.com" \ commit -am "chore(r): bump to 2.0.Y for next CRAN release" git push origin main`

### C. Tag and push (R-specific tag pattern)

**Tag naming:** Use `r-v2.0.0` for R releases. The Python publish
workflow (`python-publish.yml`) is triggered by the `v[2-9].*.*` glob
pattern, so plain `v2.0.0` tags would also fire it (incorrectly). The
`r-` prefix disambiguates.

``` bash
cd /Users/Zoli/Code/Orthologs/2-venn-diagram
git checkout main && git pull
git tag r-v2.0.0
git push origin r-v2.0.0
```

This does NOT trigger any auto-publish workflow (R has no PyPI-like
auto-upload). It just creates the immutable git tag for reference.

### D. Create the GitHub Release

``` bash
cd /Users/Zoli/Code/Orthologs/2-venn-diagram
gh release create r-v2.0.0 \
    --title "vennDiagramLab R 2.0.0 — first CRAN + Bioconductor release" \
    --notes "$(awk '/^## v2.0.0/{flag=1; print; next} /^## v[0-9]/{flag=0} flag' r/NEWS.md)" \
    --verify-tag
```

The `--notes` shell pipeline extracts the v2.0.0 section from
`r/NEWS.md` (everything between the `## v2.0.0` heading and the next
`## v` heading).

Zenodo will pick up the release within a few minutes and mint a fresh
DOI.

### E. CRAN submission

The recommended path is
[`devtools::release()`](https://devtools.r-lib.org/reference/release.html)
— interactive, walks through all checks + uploads via the CRAN web form.

``` bash
cd /Users/Zoli/Code/Orthologs/2-venn-diagram
Rscript -e 'devtools::release(pkg = "r")'
```

The interactive prompts (paraphrased):

    Have you checked for spelling errors (with spelling::spell_check_package())?
    > y
    Have you run R CMD check on the package?
    > y
    Are CRAN incoming feasibility NOTEs OK? (i.e. only the "New submission" NOTE)
    > y
    Have you addressed all reverse dependencies (revdep)?
    > y      # No reverse deps for a new package
    Are you ready to upload?
    > y

`devtools` builds the tarball, opens the CRAN web form in your browser
pre-filled with submission notes from `r/cran-comments.md`, and uploads.
You’ll receive a confirmation email from CRAN within a few minutes
asking to confirm the submission.

**Then:**

- Open the email, click the confirmation link.
- Wait 1-2 days for the automated CRAN incoming-checks bot.
- Wait 1-2 weeks for the human CRAN reviewer.
- Expect 2-3 review rounds for first submission. Common requests:
  - Tone down `Description:` (remove marketing language)
  - Add `\value{}` documentation to any function the reviewer thinks is
    missing one (Phase 8 Task B6 audit confirmed all 30 are present, but
    sometimes reviewers want explicit
    non-[`invisible()`](https://rdrr.io/r/base/invisible.html) returns
    documented)
  - Provide `\dontrun{}` justification (we use `\donttest{}` already;
    should be fine)
  - Adjust `Authors@R` cre vs aut roles
- For each review feedback round: address in code, bump to v2.0.X+1,
  push, re-run
  [`devtools::release()`](https://devtools.r-lib.org/reference/release.html).
- On acceptance: package live on
  <https://cran.r-project.org/package=vennDiagramLab> within 1-2 days,
  mirrored worldwide.

### F. Bioconductor submission

Bioconductor submission goes through a public issue tracker. The Bioc
Single Package Builder (SPB) auto-checks the package across all
platforms + Bioc dependencies.

1.  **Open the contribution issue:**
    - URL: <https://github.com/Bioconductor/Contributions/issues/new>

    - Title: `vennDiagramLab`

    - Body template:

          - **Update the following URL to point to the GitHub repository of
            the package you wish to submit to Bioconductor**
            AdditionalPackage: https://github.com/ZoliQua/Venn-Diagram-Lab

    - The `AdditionalPackage:` URL must end at the repository root (not
      `/r`). Bioc SPB handles the `r/` subdir via the `bioc.subdir`
      field in the package’s BiocManager metadata.
2.  **Within minutes:** the SPB bot leaves a comment with the build
    status across Bioc-supported R versions and platforms.
3.  **First-pass typical issues:** SPB may flag missing biocViews terms,
    missing methods documentation, or version-mismatch with Bioc devel
    branch. Address in code + push to main; SPB re-checks automatically.
4.  **Manual review (4-8 weeks):** a Bioc team member + community
    reviewers read the package + ask questions in the issue thread.
5.  **On acceptance:** package added to next Bioconductor release branch
    (releases happen every 6 months, April + October).
6.  **Initial Bioc version:** Bioc convention is `0.99.X` for first
    submission (becomes `1.0.X` upon release). Our spec keeps `2.0.0` to
    match the unified monorepo version. The reviewer may request a
    `0.99.X` version specifically — if so, bump `r/DESCRIPTION::Version`
    to `0.99.0`, push, re-trigger SPB.

The CRAN submission and Bioc submission can run **in parallel** —
they’re independent registries.

### G. Zenodo DOI verification

After the GitHub release in step D fires, Zenodo automatically:

1.  Archives the source tarball at the release tag.
2.  Mints a fresh DOI under the same Zenodo “concept” (parent DOI =
    `10.5281/zenodo.20000599`).
3.  Emails the maintainer (`ssdbtc@gmail.com`) with the new
    version-specific DOI within ~5-10 minutes.

**Verify:** 1. Go to <https://zenodo.org/account/settings/github/> and
find the entry for `ZoliQua/Venn-Diagram-Lab`. The latest release
(`r-v2.0.0`) should be listed with its own DOI link. 2. Update
`CITATION.cff::doi` to the new version-specific DOI:
`bash cd /Users/Zoli/Code/Orthologs/2-venn-diagram # Edit CITATION.cff: doi: "10.5281/zenodo.<new_id>" git -c user.name="Zoltán Dul" -c user.email="ssdbtc@gmail.com" \ commit -am "docs: update Zenodo DOI for vennDiagramLab R v2.0.0" git push origin main`
3. (Optional) Add a DOI badge to `r/README.md`:
`markdown [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.<new_id>.svg)](https://doi.org/10.5281/zenodo.<new_id>)`

### H. Post-acceptance checklist

Once both CRAN and Bioconductor accept (~2-6 weeks total):

1.  Update `r/README.md` install line to mention `install.packages`
    works for end-users.
2.  Open issue templates for users to report bugs at the support site
    (Bioc) and GitHub Issues (CRAN-style).
3.  Plan next release cycle. For Bioc, the cycle is 6-monthly; bump to
    v2.1.0 in Bioc-devel branch (per Bioc’s odd-MINOR convention)
    shortly after acceptance.

## Rollback

If a CRAN release is broken:

- **CRAN cannot be rolled back** — versions are immutable.
- Submit a patch release (v2.0.1) with the fix.
- Optionally email <cran@r-project.org> asking for the broken version to
  be archived early.

If a Bioc release is broken:

- Bioc is more forgiving — you can push fixes to the release branch
  within the same 6-month cycle.
- Use `git tag RELEASE_3_19` (or current) and push to bioc-git mirror.

## Common gotchas

- **CRAN URL check** — every URL in DESCRIPTION + man pages + vignettes
  is HTTP-HEAD’d. Broken URLs become NOTEs. We worked around this in
  Phase 8 by pointing README to the GitHub tree (gh-pages was not yet
  live); Phase 9 reverts that once gh-pages is deployed.
- **CRAN policy: examples must run in \<5s each** — our `\donttest{}`
  examples are exempt from this when CRAN runs `R CMD check` (not
  `--run-donttest`). The `r-cmd-check.yml` CI cells DO run
  `--run-donttest` to catch real failures.
- **Bioc reviewer style preferences** — Bioc reviewers sometimes prefer
  `vapply` over `sapply`, `seq_len(n)` over `1:n`, BiocStyle vignettes
  over rmarkdown::html_vignette. We use the latter; this is acceptable
  for the v2.0.0 release.
- **Zenodo DOI ordering** — the parent (concept) DOI stays the same
  across versions; only version-specific DOIs change. Cite the parent
  DOI in CITATION.cff for “this software” and the version-specific DOI
  in release notes.
