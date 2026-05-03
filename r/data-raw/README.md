# r/data-raw/

Scripts that produce raw data shipped with the package under `r/inst/extdata/`.

## sync_data.R

Copies bundled assets from the monorepo root into `r/inst/extdata/`:

- `models/svg/` → `r/inst/extdata/models/svg/` (44 SVG templates)
- `models/json/` → `r/inst/extdata/models/json/` (44 region JSON files)
- `data/dataset_*.{csv,tsv}` → `r/inst/extdata/samples/` (5 sample datasets)

This is the R-side counterpart of `python/scripts/sync_data.py`. Both scripts
read from the same source files and produce equivalent destinations in their
respective packages.

### When to run

* Before `R CMD build r/` or `devtools::install("r")` for the first time
* After modifying any file under `models/` or `data/` at the repo root
* Whenever `r/inst/extdata/` is missing (e.g. fresh git clone — the directory
  is gitignored)

### How

```bash
Rscript r/data-raw/sync_data.R
```

CI workflows run this automatically before `R CMD check`.

### Output verification

```bash
ls r/inst/extdata/models/svg/ | wc -l    # expect 44
ls r/inst/extdata/models/json/ | wc -l   # expect 44
ls r/inst/extdata/samples/ | wc -l       # expect 5
```
