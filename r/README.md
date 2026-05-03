# vennDiagramLab

R package companion to the [Venn Diagram Lab web tool](https://www.venndiagramlab.org/) and the [Python `venn-diagram-lab` package](https://pypi.org/project/venn-diagram-lab/). Headless Venn / UpSet diagram analysis and rendering for bioinformaticians and biostatisticians who work natively in R.

**Status:** Phase 0 — skeleton only. Real functionality lands in Phase 1+.

## Install (development)

From a fresh R session:

```r
# Once R is installed (brew install r on macOS):
install.packages("devtools", repos = "https://cloud.r-project.org")
devtools::install("r")        # from the monorepo root
```

## Run tests

```r
devtools::test("r")
```

## Build the package tarball

```bash
Rscript r/data-raw/sync_data.R
R CMD build r/
```

## More

- Web tool: https://www.venndiagramlab.org/
- Python package: https://pypi.org/project/venn-diagram-lab/
- Repository: https://github.com/ZoliQua/Venn-Diagram-Lab
