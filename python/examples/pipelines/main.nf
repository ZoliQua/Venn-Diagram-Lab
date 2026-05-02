// main.nf -- minimal Nextflow pipeline running vdl analyze
//
// Usage:
//   nextflow run python/examples/pipelines/main.nf

params.input = "python/src/venn_diagram_lab/_data/samples/dataset_real_cancer_drivers_4.tsv"
params.outdir = "results/cancer_drivers"

process AnalyzeAndReport {
    publishDir params.outdir, mode: 'copy'

    input:
    path tsv

    output:
    path "venn.svg"
    path "upset.png"
    path "network.png"
    path "report.pdf"
    path "statistics.tsv"

    script:
    """
    vdl analyze ${tsv} --output-dir .
    """
}

workflow {
    Channel.fromPath(params.input) | AnalyzeAndReport
}
