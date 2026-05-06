# SVG rendering: template the 44 bundled model SVGs from a RegionResult.
# Mirrors python/src/venn_diagram_lab/render/svg.py (244 lines).
#
# All helpers are private (leading dot, @noRd). The single public function
# render_venn_svg is exported. xml2 is the XML library (Imports declared
# in DESCRIPTION).

#' @importFrom xml2 read_xml xml_find_all xml_find_first xml_text xml_attr xml_set_text xml_set_attr
NULL

#' @noRd
.models_svg_dir <- function() {
    system.file("extdata", "models", "svg", package = "vennDiagramLab", mustWork = TRUE)
}

#' @noRd
.is_venn_model <- function(name) {
    startsWith(name, "venn")
}

#' @noRd
.load_template <- function(name) {
    if (!.is_venn_model(name)) {
        .stop_unknown_model(sprintf(
            "%s is not a venn model (use list_models() to see available)", sQuote(name)
        ))
    }
    path <- file.path(.models_svg_dir(), sprintf("%s.svg", name))
    if (!file.exists(path)) {
        .stop_unknown_model(sprintf(
            "Model %s not found in bundled SVG directory. Run `Rscript r/data-raw/sync_data.R` to populate inst/extdata/models/svg/.",
            sQuote(name)
        ))
    }
    paste(readLines(path, warn = FALSE, encoding = "UTF-8"), collapse = "\n")
}

#' @noRd
# Match `fill:#XXXXXX` (3- or 6-digit hex) inside an inline style attribute.
.FILL_RE <- "fill:\\s*#[0-9A-Fa-f]{3,6}"

#' @noRd
# Locate an element by its `id` attribute, namespace-agnostic. Mirrors
# Python's iterative walk (root.iter()) -- sidesteps lxml/xml2 XPath
# namespace gymnastics. Returns NULL on miss.
.find_by_id <- function(root, id_value) {
    matches <- xml2::xml_find_all(root, sprintf(".//*[@id='%s']", id_value))
    if (length(matches) == 0L) return(NULL)
    matches[[1L]]
}

#' @noRd
.set_text <- function(root, id_value, text) {
    el <- .find_by_id(root, id_value)
    if (is.null(el)) return(invisible(NULL))
    xml2::xml_set_text(el, text)
    invisible(NULL)
}

#' @noRd
.replace_fill_color <- function(root, id_value, hex_color) {
    el <- .find_by_id(root, id_value)
    if (is.null(el)) return(invisible(NULL))
    style <- xml2::xml_attr(el, "style")
    if (is.na(style) || nchar(style) == 0L) return(invisible(NULL))
    new_style <- sub(.FILL_RE, sprintf("fill:%s", hex_color), style, perl = FALSE)
    if (new_style != style) {
        xml2::xml_set_attr(el, "style", new_style)
    }
    invisible(NULL)
}

#' @noRd
.count_ids_for_set_count <- function(n) {
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n)]
    out <- character()
    for (size in seq_len(n)) {
        combos <- utils::combn(letters_chars, size, simplify = FALSE)
        for (combo in combos) {
            out <- c(out, sprintf("Count_%s", paste(combo, collapse = "")))
        }
    }
    out
}

#' @noRd
.apply_counts <- function(root, result, show) {
    n <- length(result@dataset@set_names)
    count_ids <- .count_ids_for_set_count(n)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]]
    if (isTRUE(show)) {
        for (cid in count_ids) {
            .set_text(root, cid, "0")
        }
        for (region in result@regions) {
            .set_text(root, sprintf("Count_%s", region@label),
                      as.character(length(region@exclusive_items)))
        }
        # CountSUM_X = inclusive set total. Present on all 44 bundled models.
        for (i in seq_len(n)) {
            .set_text(root, sprintf("CountSUM_%s", letters_chars[i]),
                      as.character(result@set_sizes[[result@dataset@set_names[[i]]]]))
        }
    } else {
        for (cid in count_ids) {
            .set_text(root, cid, "")
        }
        for (i in seq_len(n)) {
            .set_text(root, sprintf("CountSUM_%s", letters_chars[i]), "")
        }
    }
    invisible(NULL)
}

#' Render a RegionResult onto its model SVG and return the raw SVG string
#'
#' Loads the bundled SVG template for `result@model` (or the explicit `model`
#' override), walks the DOM via xml2 to overwrite text content (`Name*`,
#' `Count_*`, `CountSUM_*`, `Title`) and inline `fill:` colors (`Shape*`,
#' `Shape*2` for Euler extras, `Bullet*`), and serializes back to a string.
#'
#' For `model = "proportional"`, delegates to [generate_proportional_svg()].
#'
#' Mirrors Python `render_venn_svg` byte-for-byte except for: (a) the return
#' type is `character` instead of an `SvgImage` wrapper class; (b) xml2 may
#' emit slightly different whitespace/attribute ordering than lxml. Functional
#' content (text, fill colors, structure) is identical.
#'
#' @param result A [`RegionResult-class`].
#' @param model Optional model id override (filename stem). Default = `result@model`.
#' @param set_names Optional named character vector mapping letters (`"A"`, `"B"`, ...)
#'   to display names. Unspecified letters fall back to `result@dataset@set_names`.
#' @param colors Optional named character vector mapping letters to fill hex colors.
#'   Applies to `BulletX`, `ShapeX`, and `ShapeX2` (Euler extra shapes).
#' @param title Optional title override. If `NULL`, the template's default title
#'   text is preserved.
#' @param show_names If `FALSE`, blanks every `NameA-I` element.
#' @param show_counts If `FALSE`, blanks every `Count_*` and `CountSUM_*` element.
#' @return A `character` (length 1) with the raw SVG.
#' @export
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' svg <- render_venn_svg(result)
#' nchar(svg) > 0
#' \donttest{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' svg <- render_venn_svg(result)
#' nchar(svg) > 0
#' }
render_venn_svg <- function(result,
                             model = NULL,
                             set_names = NULL,
                             colors = NULL,
                             title = NULL,
                             show_names = TRUE,
                             show_counts = TRUE) {
    model_name <- if (is.null(model)) result@model else model

    if (model_name == "proportional") {
        return(generate_proportional_svg(result))
    }

    template <- .load_template(model_name)
    root <- xml2::read_xml(template)

    n <- length(result@dataset@set_names)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]]
    name_overrides <- if (is.null(set_names)) list() else as.list(set_names)

    # Names: override > dataset default
    if (isTRUE(show_names)) {
        for (i in seq_len(n)) {
            letter <- letters_chars[i]
            name <- if (!is.null(name_overrides[[letter]]))
                name_overrides[[letter]] else result@dataset@set_names[[i]]
            .set_text(root, sprintf("Name%s", letter), name)
        }
    } else {
        for (i in seq_len(n)) {
            .set_text(root, sprintf("Name%s", letters_chars[i]), "")
        }
    }

    # Counts (exclusive regions) and CountSUM (inclusive set totals)
    .apply_counts(root, result, show = show_counts)

    # Title: only override if caller passed one
    if (!is.null(title)) {
        .set_text(root, "Title", title)
    }

    # Colors: per-letter override applies to BulletX, ShapeX, ShapeX2 (Euler)
    if (!is.null(colors) && length(colors) > 0L) {
        for (letter in names(colors)) {
            hex_color <- colors[[letter]]
            .replace_fill_color(root, sprintf("Bullet%s", letter), hex_color)
            .replace_fill_color(root, sprintf("Shape%s",  letter), hex_color)
            .replace_fill_color(root, sprintf("Shape%s2", letter), hex_color)
        }
    }

    as.character(root)
}
