# Unit tests for network-export.R string builders, on a hand-built NetworkData
# list (structure mirrors packages/core/src/__tests__/networkExport.test.ts).
# Parity-vs-goldens is covered separately in test-parity-network-export.R.

.node <- function(id, label, size) {
    list(id = id, label = label, size = size, radius = 0)
}

.edge <- function(source, target, weight = 12, intersection = 12, jaccard = 0.25,
                   fold_enrichment = 1.5, overlap_coefficient = 0.5, dice = 0.4,
                   p_value = 0.0005, p_adjusted = 0.02, significant = TRUE) {
    list(source = source, target = target, weight = weight, intersection = intersection,
         jaccard = jaccard, fold_enrichment = fold_enrichment,
         overlap_coefficient = overlap_coefficient, dice = dice,
         p_value = p_value, p_adjusted = p_adjusted, significant = significant,
         name_a = source, name_b = target)
}

DATA <- list(
    nodes = list(.node("A", "Alpha", 40), .node("B", "B & <beta>", 30), .node("C", "Gamma", 10)),
    edges = list(
        .edge("A", "B", weight = 12, intersection = 12, jaccard = 0.2, fold_enrichment = 1.234,
              overlap_coefficient = 0.6, dice = 0.3, p_value = 0.0005, p_adjusted = 0.001, significant = TRUE),
        .edge("A", "C", weight = 3, intersection = 3, jaccard = 0.06, fold_enrichment = 0.8,
              overlap_coefficient = 0.3, dice = 0.11, p_value = 0.4, p_adjusted = 0.4, significant = FALSE)
    )
)

test_that(".network_sif_string emits one tab-separated overlap line per edge, no trailing newline", {
    expect_identical(.network_sif_string(DATA), "A\toverlap\tB\nA\toverlap\tC")
})

test_that(".network_sif_string emits isolated nodes as lone lines after edges", {
    data <- list(
        nodes = list(.node("A", "A", 1), .node("B", "B", 1), .node("C", "C", 1)),
        edges = list(.edge("A", "B"))
    )
    expect_identical(.network_sif_string(data), "A\toverlap\tB\nC")
})

test_that(".network_graphml_string starts with the pinned XML declaration and graphml root", {
    xml <- .network_graphml_string(DATA)
    lines <- strsplit(xml, "\n", fixed = TRUE)[[1L]]
    expect_identical(lines[1L], '<?xml version="1.0" encoding="UTF-8"?>')
    expect_identical(lines[2L], '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">')
    expect_true(endsWith(xml, "</graphml>"))
    expect_false(endsWith(xml, "\n"))
})

test_that(".network_graphml_string declares keys in the fixed order", {
    xml <- .network_graphml_string(DATA)
    expect_true(grepl('<key id="d0" for="node" attr.name="label" attr.type="string"/>', xml, fixed = TRUE))
    expect_true(grepl('<key id="d1" for="node" attr.name="size" attr.type="long"/>', xml, fixed = TRUE))
    expect_true(grepl('<key id="d2" for="edge" attr.name="weight" attr.type="double"/>', xml, fixed = TRUE))
    expect_true(grepl('<key id="d10" for="edge" attr.name="significant" attr.type="boolean"/>', xml, fixed = TRUE))
    expect_lt(regexpr("d0", xml, fixed = TRUE), regexpr("d1", xml, fixed = TRUE))
    expect_lt(regexpr('attr.name="weight"', xml, fixed = TRUE), regexpr('attr.name="intersection"', xml, fixed = TRUE))
})

test_that(".network_graphml_string renders a node with escaped label and integer size", {
    xml <- .network_graphml_string(DATA)
    expect_true(grepl(
        '    <node id="B">\n      <data key="d0">B &amp; &lt;beta&gt;</data>\n      <data key="d1">30</data>\n    </node>',
        xml, fixed = TRUE
    ))
})

test_that(".network_graphml_string renders an edge with pinned numeric formatting and ordering", {
    xml <- .network_graphml_string(DATA)
    expected <- paste(
        '    <edge source="A" target="B">',
        '      <data key="d2">12.000000</data>',
        '      <data key="d3">12</data>',
        '      <data key="d4">0.2000</data>',
        '      <data key="d5">1.234</data>',
        '      <data key="d6">0.6000</data>',
        '      <data key="d7">0.3000</data>',
        '      <data key="d8">5.00e-4</data>',
        '      <data key="d9">0.001000</data>',
        '      <data key="d10">true</data>',
        '    </edge>',
        sep = "\n"
    )
    expect_true(grepl(expected, xml, fixed = TRUE))
})

test_that(".network_graphml_string uses fmt_p for large p-values and false for non-significant edges", {
    xml <- .network_graphml_string(DATA)
    expect_true(grepl("<data key=\"d8\">0.400000</data>", xml, fixed = TRUE))
    expect_true(grepl("<data key=\"d10\">false</data>", xml, fixed = TRUE))
})

test_that(".network_graphml_string uses the undirected graph default", {
    xml <- .network_graphml_string(DATA)
    expect_true(grepl('  <graph edgedefault="undirected">', xml, fixed = TRUE))
})

test_that(".network_xml_escape escapes & first, then < > \" '", {
    expect_identical(.network_xml_escape("a & b"), "a &amp; b")
    expect_identical(.network_xml_escape("<a>\"b\"'c'"), "&lt;a&gt;&quot;b&quot;&apos;c&apos;")
    # & must be escaped first, or entities introduced by later replacements
    # would get double-escaped.
    expect_identical(.network_xml_escape("<"), "&lt;")
})
