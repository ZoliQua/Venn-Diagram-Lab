#' Get the vennDiagramLab package version
#'
#' Returns the installed version of vennDiagramLab as a character string.
#' This trivial function exists so the Phase 0 skeleton has one public
#' export; Phase 1 introduces the real `analyze()` / `load_*()` API.
#'
#' @return Character string, the package version (e.g. "2.0.0").
#' @export
#' @examples
#' vdl_version()
vdl_version <- function() {
    as.character(utils::packageVersion("vennDiagramLab"))
}
