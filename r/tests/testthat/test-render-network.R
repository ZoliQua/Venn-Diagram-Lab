test_that(".build_network_data returns nodes + edges for a 3-set result", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
        item_order = c("x", "y", "z", "w"),
        universe_size = 100L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    data <- .build_network_data(res)
    expect_type(data, "list")
    expect_named(data, c("nodes", "edges"))
    expect_length(data$nodes, 3L)
    # 3 sets -> 3 pairs (n choose 2)
    expect_length(data$edges, 3L)

    # Each node has id, label, size, radius
    n <- data$nodes[[1L]]
    expect_named(n, c("id", "label", "size", "radius"))
    expect_equal(n$id, "A")
    expect_equal(n$label, "A")
    expect_equal(n$size, 2L)
})

test_that(".build_network_data computes radius via 12 + sqrt(size/max) * 22", {
    ds <- methods::new("VennDataset",
        set_names = c("Big", "Small"),
        items = list(Big = as.character(1:100), Small = as.character(95:100)),
        item_order = as.character(1:100),
        universe_size = 100L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    data <- .build_network_data(res)
    big   <- data$nodes[[1L]]
    small <- data$nodes[[2L]]
    expect_equal(big$radius,   12 + sqrt(100 / 100) * 22, tolerance = 1e-6)
    expect_equal(small$radius, 12 + sqrt(  6 / 100) * 22, tolerance = 1e-6)
})

test_that(".weight_for_metric returns the correct value for each metric", {
    expect_equal(.weight_for_metric("intersection",        5L, 0.3, 4.0, 0.5), 5)
    expect_equal(.weight_for_metric("jaccard",             5L, 0.3, 4.0, 0.5), 0.3)
    expect_equal(.weight_for_metric("fold_enrichment",     5L, 0.3, 4.0, 0.5), 4.0)
    expect_equal(.weight_for_metric("overlap_coefficient", 5L, 0.3, 4.0, 0.5), 0.5)
})

test_that(".weight_for_metric caps fold_enrichment at 20.0", {
    expect_equal(.weight_for_metric("fold_enrichment", 5L, 0.3, 100.0, 0.5), 20.0)
    expect_equal(.weight_for_metric("fold_enrichment", 5L, 0.3,   5.0, 0.5),  5.0)
})

test_that(".build_network_data populates edge fields with significance", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("x", "y", "z"), B = c("x", "y", "w")),
        item_order = c("x", "y", "z", "w"),
        universe_size = 100L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    data <- .build_network_data(res)
    expect_length(data$edges, 1L)
    e <- data$edges[[1L]]
    expect_named(e, c("source", "target", "weight", "intersection", "jaccard",
                      "fold_enrichment", "overlap_coefficient", "dice",
                      "p_value", "p_adjusted", "significant", "name_a", "name_b"))
    expect_equal(e$source, "A")
    expect_equal(e$target, "B")
    expect_equal(e$intersection, 2L)
    expect_type(e$significant, "logical")
})

test_that("render_network returns a ggplot for a 3-set result", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
        item_order = c("x", "y", "z", "w"),
        universe_size = 100L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    p <- render_network(res)
    expect_true(inherits(p, "ggplot"))
})

test_that("render_network errors on invalid edge_metric", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = "x", B = "y"),
        item_order = c("x", "y"),
        universe_size = 2L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    expect_error(render_network(res, edge_metric = "nonsense"),
                 regexp = "Unknown edge_metric")
})

test_that("render_network honors edge_metric parameter (no error for valid metrics)", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
        item_order = c("x", "y", "z", "w"),
        universe_size = 100L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    for (metric in c("intersection", "jaccard", "fold_enrichment", "overlap_coefficient")) {
        p <- render_network(res, edge_metric = metric)
        expect_true(inherits(p, "ggplot"), info = metric)
    }
})

test_that("render_network honors node_color_map override", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("x", "y"), B = c("y", "z")),
        item_order = c("x", "y", "z"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    p <- render_network(res, node_color_map = c(A = "#FF00FF"))
    expect_true(inherits(p, "ggplot"))
})

test_that("render_network is deterministic given the same seed", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
        item_order = c("x", "y", "z", "w"),
        universe_size = 100L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    p1 <- render_network(res, seed = 42L)
    p2 <- render_network(res, seed = 42L)
    # Verify the same ggraph layout coords by sampling the graph layer's data.
    layout1 <- ggplot2::layer_data(p1, 1L)
    layout2 <- ggplot2::layer_data(p2, 1L)
    expect_equal(layout1, layout2)
})
