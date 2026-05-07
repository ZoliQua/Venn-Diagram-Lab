## Resubmission

This is a resubmission. v2.0.1 was pretested by win-builder and failed with
12 byte-parity tests on Windows due to text-mode line-ending conversion in
the TSV writers (`cat(out, file = path)` converts "\n" → "\r\n" on Windows;
the parity tests + Python golden fixtures use "\n" only). v2.0.2 fixes this
by opening the destination file in binary ("wb") mode via a new
`.write_bytes()` helper. No public-API changes.

## Test environments

* local macOS 14.6 (Apple Silicon), R 4.6.0
* GitHub Actions:
  * ubuntu-latest, R 4.4 (release)
  * ubuntu-latest, R 4.5 (devel)
  * ubuntu-latest, R 4.3 (oldrel-1)
  * macos-latest, R 4.6 (release)
  * windows-latest, R 4.4 (release)

## R CMD check results

0 ERRORs | 0 WARNINGs | 1 NOTE

* "New submission" — expected.

## Downstream dependencies

None — this is a new package.

## Companion packages

`vennDiagramLab` is the R companion to the
[`venn-diagram-lab` Python package](https://pypi.org/project/venn-diagram-lab/)
(v2.0.3 on PyPI) and the [Venn Diagram Lab web
tool](https://www.venndiagramlab.org/). The three implementations share the
same SVG model library and produce byte-equivalent TSV outputs (verified by
12 parity tests against shared golden fixtures).

## Notes for the reviewer

* Five bundled sample datasets in `inst/extdata/samples/` (~250 KB total)
  cover both biological (cancer drivers, MSigDB pathways) and mock
  (streaming platforms, gene sets) scenarios — all used in the eight
  vignettes for fully self-contained execution.
* `inst/extdata/models/` contains 44 SVG model templates + 44 JSON region
  files (~700 KB total) from a dozen published Venn / Edwards / Grünbaum /
  Anderson / Carroll / Mamakani / SUMO construction methods — bundled for
  byte-equivalent rendering parity with the web tool.
