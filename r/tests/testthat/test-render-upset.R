test_that(".upset_data_from_region_result builds data with one row per non-empty region", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    data <- .upset_data_from_region_result(res)
    expect_type(data, "list")
    expect_named(data, c("sets", "intersections"))
    expect_equal(data$sets, c("A", "B"))
    # 3 non-empty regions: A only={g1}, B only={g3}, AB={g2}
    expect_length(data$intersections, 3L)
    # Each intersection has members + size + label
    expect_named(data$intersections[[1L]], c("members", "size", "label"))
})

test_that(".upset_data_from_region_result skips empty regions", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = "x", B = "y", C = "z"),
        item_order = c("x", "y", "z"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    data <- .upset_data_from_region_result(res)
    # Only the 3 single-set regions are non-empty; AB/AC/BC/ABC are empty.
    expect_length(data$intersections, 3L)
    labels <- vapply(data$intersections, function(x) x$label, character(1L))
    expect_setequal(labels, c("A", "B", "C"))
})

test_that(".sort_by_size sorts intersections descending", {
    intersections <- list(
        list(members = "A",  size = 5L, label = "A"),
        list(members = "B",  size = 10L, label = "B"),
        list(members = c("A", "B"), size = 1L, label = "AB")
    )
    data <- list(sets = c("A", "B"), intersections = intersections)
    sorted <- .sort_by_size(data)
    sizes <- vapply(sorted, function(x) x$size, integer(1L))
    expect_equal(sizes, c(10L, 5L, 1L))
})

test_that(".sort_by_degree sorts by membership degree ASC then label", {
    intersections <- list(
        list(members = c("A", "B"), size = 1L, label = "AB"),
        list(members = "B",  size = 10L, label = "B"),
        list(members = "A",  size = 5L, label = "A")
    )
    data <- list(sets = c("A", "B"), intersections = intersections)
    sorted <- .sort_by_degree(data)
    labels <- vapply(sorted, function(x) x$label, character(1L))
    expect_equal(labels, c("A", "B", "AB"))
})

test_that(".bar_colors mode 'custom' uses the provided mapping with fallback", {
    intersections <- list(
        list(members = "A",  size = 5L, label = "A"),
        list(members = "B",  size = 10L, label = "B"),
        list(members = c("A", "B"), size = 1L, label = "AB")
    )
    colors <- .bar_colors(intersections, mode = "custom", custom = c(A = "#FF0000", AB = "#00FF00"))
    expect_equal(colors, c("#FF0000", "#cccccc", "#00FF00"))
})

test_that(".bar_colors mode 'custom' with NULL custom uses fallback for all", {
    intersections <- list(
        list(members = "A", size = 5L, label = "A"),
        list(members = "B", size = 10L, label = "B")
    )
    colors <- .bar_colors(intersections, mode = "custom", custom = NULL)
    expect_equal(colors, c("#cccccc", "#cccccc"))
})

test_that(".bar_colors mode 'heatmap' returns hex strings of correct length", {
    intersections <- list(
        list(members = "A", size = 5L, label = "A"),
        list(members = "B", size = 10L, label = "B"),
        list(members = c("A", "B"), size = 1L, label = "AB")
    )
    colors <- .bar_colors(intersections, mode = "heatmap", custom = NULL)
    expect_length(colors, 3L)
    expect_true(all(grepl("^#[0-9A-Fa-f]{6}$", colors)))
})

test_that(".bar_colors mode 'heatmap' returns single color when all sizes equal", {
    intersections <- list(
        list(members = "A", size = 5L, label = "A"),
        list(members = "B", size = 5L, label = "B")
    )
    colors <- .bar_colors(intersections, mode = "heatmap", custom = NULL)
    expect_equal(colors, c("#888888", "#888888"))
})

test_that(".bar_colors mode 'depth' returns hex strings keyed by member-count viridis", {
    intersections <- list(
        list(members = "A",            size = 5L,  label = "A"),
        list(members = c("A", "B"),    size = 10L, label = "AB"),
        list(members = c("A", "B", "C"), size = 1L, label = "ABC")
    )
    colors <- .bar_colors(intersections, mode = "depth", custom = NULL)
    expect_length(colors, 3L)
    expect_true(all(grepl("^#[0-9A-Fa-f]{6}$", colors)))
})

test_that(".bar_colors mode 'depth' returns single color when all degrees equal", {
    intersections <- list(
        list(members = "A", size = 5L, label = "A"),
        list(members = "B", size = 6L, label = "B")
    )
    colors <- .bar_colors(intersections, mode = "depth", custom = NULL)
    expect_equal(colors, c("#444444", "#444444"))
})

test_that("render_upset returns a ggplot for a 3-set toy dataset", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
        item_order = c("x", "y", "z", "w"),
        universe_size = 4L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    p <- render_upset(res)
    expect_true(inherits(p, "ggplot") || inherits(p, "patchwork"))
})

test_that("render_upset honors max_columns to cap intersection count", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = c("x", "y", "z"), B = c("y", "z", "w"), C = c("z", "w", "v")),
        item_order = c("x", "y", "z", "w", "v"),
        universe_size = 5L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    # max_columns = 1 should still produce a ggplot (not error).
    p <- render_upset(res, max_columns = 1L)
    expect_true(inherits(p, "ggplot") || inherits(p, "patchwork"))
})

test_that("render_upset honors threshold to filter small intersections", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    # threshold = 5L excludes all (toy has size 1) -- should still produce a ggplot.
    p <- render_upset(res, threshold = 5L)
    expect_true(inherits(p, "ggplot") || inherits(p, "patchwork"))
})

test_that("render_upset works on bundled cancer drivers sample", {
    skip_if_not(file.exists(system.file("extdata", "samples",
                                          "dataset_real_cancer_drivers_4.tsv",
                                          package = "vennDiagramLab")),
                "extdata/samples not synced")
    res <- analyze(load_sample("dataset_real_cancer_drivers_4"))
    p <- render_upset(res, sort_by = "degree", color_mode = "heatmap")
    expect_true(inherits(p, "ggplot") || inherits(p, "patchwork"))
})
