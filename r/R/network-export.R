# Cytoscape-compatible network exports (.sif + .graphml). Mirrors
# packages/core/src/networkExport.ts (toSif/toGraphml) and
# python/src/venn_diagram_lab/render/network.py
# (to_network_sif/to_network_graphml) byte-for-byte.
#
# Both formats are deterministic pure string builders derived from
# .build_network_data() (see render-network.R). Node/edge order, numeric
# rendering, indentation, XML escaping and line endings are all pinned on
# purpose -- this is the parity contract, do not reorder or reformat.

.NETWORK_SIF_INTERACTION <- "overlap"

# Fixed GraphML key order -- do not reorder. Each row: id, for, attr.name, attr.type.
.NETWORK_GRAPHML_KEYS <- list(
    list(id = "d0",  for_ = "node", name = "label",          type = "string"),
    list(id = "d1",  for_ = "node", name = "size",           type = "long"),
    list(id = "d2",  for_ = "edge", name = "weight",         type = "double"),
    list(id = "d3",  for_ = "edge", name = "intersection",   type = "long"),
    list(id = "d4",  for_ = "edge", name = "jaccard",        type = "double"),
    list(id = "d5",  for_ = "edge", name = "foldEnrichment", type = "double"),
    list(id = "d6",  for_ = "edge", name = "overlapCoeff",   type = "double"),
    list(id = "d7",  for_ = "edge", name = "dice",           type = "double"),
    list(id = "d8",  for_ = "edge", name = "pValue",         type = "double"),
    list(id = "d9",  for_ = "edge", name = "fdr",            type = "double"),
    list(id = "d10", for_ = "edge", name = "significant",    type = "boolean")
)

#' @noRd
# XML-escape text/attribute content: `&` first, then `< > " '`. Order matters
# -- escaping `&` after the others would double-escape the entities they
# introduce. Mirrors networkExport.ts `xmlEscape` / network.py `_xml_escape`.
.network_xml_escape <- function(s) {
    s <- gsub("&", "&amp;", s, fixed = TRUE)
    s <- gsub("<", "&lt;", s, fixed = TRUE)
    s <- gsub(">", "&gt;", s, fixed = TRUE)
    s <- gsub("\"", "&quot;", s, fixed = TRUE)
    s <- gsub("'", "&apos;", s, fixed = TRUE)
    s
}

#' @noRd
# Statistics-TSV p-value formatting rule, reused for pValue + fdr.
.network_fmt_p <- function(v) {
    if (v < 0.001) .js_to_exponential_2(v) else .js_to_fixed(v, 6)
}

#' @noRd
# Cytoscape SIF (Simple Interaction Format) string for a network. One line
# per edge, in edge order: `<sourceId>\toverlap\t<targetId>` (letter ids, not
# labels). Isolated nodes (no incident edge) are emitted as lone
# single-token lines AFTER all edge lines, in node-array order. LF-joined,
# no trailing newline. Mirrors networkExport.ts `toSif` byte-for-byte.
.network_sif_string <- function(data) {
    lines <- character(0L)
    connected <- character(0L)

    for (e in data$edges) {
        connected <- c(connected, e$source, e$target)
        lines <- c(lines, paste(e$source, .NETWORK_SIF_INTERACTION, e$target, sep = "\t"))
    }

    for (node in data$nodes) {
        if (!(node$id %in% connected)) {
            lines <- c(lines, node$id)
        }
    }

    paste(lines, collapse = "\n")
}

#' @noRd
# Standard GraphML XML string for a network. 2-space indent, LF line
# endings, no trailing newline. Node data keys: label, size. Edge data keys:
# weight, intersection, jaccard, foldEnrichment, overlapCoeff, dice, pValue,
# fdr, significant. Mirrors networkExport.ts `toGraphml` byte-for-byte.
.network_graphml_string <- function(data) {
    out <- character(0L)
    out <- c(out, '<?xml version="1.0" encoding="UTF-8"?>')
    out <- c(out, '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">')

    for (k in .NETWORK_GRAPHML_KEYS) {
        out <- c(out, sprintf('  <key id="%s" for="%s" attr.name="%s" attr.type="%s"/>',
                               k$id, k$for_, k$name, k$type))
    }

    out <- c(out, '  <graph edgedefault="undirected">')

    for (node in data$nodes) {
        out <- c(out, sprintf('    <node id="%s">', .network_xml_escape(node$id)))
        out <- c(out, sprintf('      <data key="d0">%s</data>', .network_xml_escape(node$label)))
        out <- c(out, sprintf('      <data key="d1">%s</data>', as.character(as.integer(node$size))))
        out <- c(out, '    </node>')
    }

    for (e in data$edges) {
        out <- c(out, sprintf('    <edge source="%s" target="%s">',
                               .network_xml_escape(e$source), .network_xml_escape(e$target)))
        out <- c(out, sprintf('      <data key="d2">%s</data>', .js_to_fixed(e$weight, 6)))
        out <- c(out, sprintf('      <data key="d3">%s</data>', as.character(as.integer(e$intersection))))
        out <- c(out, sprintf('      <data key="d4">%s</data>', .js_to_fixed(e$jaccard, 4)))
        out <- c(out, sprintf('      <data key="d5">%s</data>', .js_to_fixed(e$fold_enrichment, 3)))
        out <- c(out, sprintf('      <data key="d6">%s</data>', .js_to_fixed(e$overlap_coefficient, 4)))
        out <- c(out, sprintf('      <data key="d7">%s</data>', .js_to_fixed(e$dice, 4)))
        out <- c(out, sprintf('      <data key="d8">%s</data>', .network_fmt_p(e$p_value)))
        out <- c(out, sprintf('      <data key="d9">%s</data>', .network_fmt_p(e$p_adjusted)))
        out <- c(out, sprintf('      <data key="d10">%s</data>', if (isTRUE(e$significant)) "true" else "false"))
        out <- c(out, '    </edge>')
    }

    out <- c(out, '  </graph>')
    out <- c(out, '</graphml>')

    paste(out, collapse = "\n")
}

#' Write the Cytoscape GraphML network export
#'
#' Mirrors the React webapp's "GraphML" Cytoscape export button + Python's
#' `to_network_graphml()` byte-for-byte. Nodes are sets (id = letter, label =
#' set name, size = inclusive cardinality); edges are ALL pairwise overlaps
#' (weight = the `intersection` metric by default) carrying jaccard,
#' foldEnrichment, overlapCoeff, dice, pValue, fdr, and significant
#' attributes. Node/edge order and numeric rendering are pinned -- see
#' `packages/core/src/networkExport.ts` for the parity contract.
#'
#' @param result A [`RegionResult-class`].
#' @param path Destination file path.
#' @return Invisibly returns `path`.
#' @export
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' to_network_graphml(result, tempfile(fileext = ".graphml"))
#' \donttest{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' to_network_graphml(result, tempfile(fileext = ".graphml"))
#' }
setGeneric("to_network_graphml",
    function(result, path) standardGeneric("to_network_graphml"))

#' @rdname to_network_graphml
setMethod("to_network_graphml", "RegionResult", function(result, path) {
    data <- .build_network_data(result)
    .write_bytes(.network_graphml_string(data), path)
    invisible(path)
})

#' Write the Cytoscape SIF network export
#'
#' Mirrors the React webapp's "SIF" Cytoscape export button + Python's
#' `to_network_sif()` byte-for-byte. One line per edge (in edge order),
#' tab-separated: source letter, the literal interaction type `overlap`, then
#' target letter. Isolated nodes (degree 0) are emitted as lone single-token
#' lines after all edges, in node order.
#'
#' @param result A [`RegionResult-class`].
#' @param path Destination file path.
#' @return Invisibly returns `path`.
#' @export
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' to_network_sif(result, tempfile(fileext = ".sif"))
#' \donttest{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' to_network_sif(result, tempfile(fileext = ".sif"))
#' }
setGeneric("to_network_sif",
    function(result, path) standardGeneric("to_network_sif"))

#' @rdname to_network_sif
setMethod("to_network_sif", "RegionResult", function(result, path) {
    data <- .build_network_data(result)
    .write_bytes(.network_sif_string(data), path)
    invisible(path)
})
