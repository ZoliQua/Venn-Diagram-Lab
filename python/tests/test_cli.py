"""Tests for venn_diagram_lab.cli (Typer)."""

from __future__ import annotations

from typer.testing import CliRunner

from venn_diagram_lab.cli import app
from venn_diagram_lab.version import __version__

runner = CliRunner()


class TestVersionCommand:
    def test_version_prints_string(self) -> None:
        result = runner.invoke(app, ["version"])
        assert result.exit_code == 0
        assert __version__ in result.stdout

    def test_help_works(self) -> None:
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "Usage:" in result.stdout


_EXPECTED_MODEL_COUNT = 44


class TestListModelsCommand:
    def test_lists_all_44_models(self) -> None:
        result = runner.invoke(app, ["list-models"])
        assert result.exit_code == 0
        assert "venn-2-set" in result.stdout
        assert "venn-3-set" in result.stdout
        # 44 models -> at least 44 occurrences of "venn-"
        assert result.stdout.count("venn-") >= _EXPECTED_MODEL_COUNT


class TestListSamplesCommand:
    def test_lists_all_5_samples(self) -> None:
        result = runner.invoke(app, ["list-samples"])
        assert result.exit_code == 0
        for expected in (
            "dataset_mock_gene_sets",
            "dataset_mock_streaming_platforms",
            "dataset_real_cancer_drivers_4",
            "dataset_real_msigdb_cancer_pathways",
            "dataset_real_msigdb_immune_pathways",
        ):
            assert expected in result.stdout


class TestAnalyzeStdoutSummary:
    def test_no_output_flag_prints_summary(self, tmp_path) -> None:
        path = tmp_path / "binary.tsv"
        path.write_text("Title\tA\tB\nx\t1\t0\ny\t0\t1\nz\t1\t1\n")
        result = runner.invoke(app, ["analyze", str(path)])
        assert result.exit_code == 0
        assert "A" in result.stdout
        assert "B" in result.stdout
        assert "set" in result.stdout.lower()

    def test_unknown_extension_errors(self, tmp_path) -> None:
        path = tmp_path / "data.unknown"
        path.write_text("nothing")
        result = runner.invoke(app, ["analyze", str(path)])
        assert result.exit_code != 0

    def test_csv_aggregated_mode(self, tmp_path) -> None:
        path = tmp_path / "agg.csv"
        path.write_text("SetA,SetB\nX,Y\nY,Z\nZ,W\n")
        result = runner.invoke(app, ["analyze", str(path), "--mode", "aggregated"])
        assert result.exit_code == 0
        assert "SetA" in result.stdout
        assert "SetB" in result.stdout


class TestAnalyzeGranularOutputs:
    def _binary_tsv(self, tmp_path):
        path = tmp_path / "in.tsv"
        path.write_text("Title\tA\tB\nx\t1\t1\ny\t1\t0\nz\t0\t1\n")
        return path

    def test_writes_venn_svg(self, tmp_path) -> None:
        path = self._binary_tsv(tmp_path)
        out = tmp_path / "venn.svg"
        result = runner.invoke(app, ["analyze", str(path), "--venn", str(out)])
        assert result.exit_code == 0
        assert out.is_file()
        assert "<svg" in out.read_text()

    def test_writes_pdf(self, tmp_path) -> None:
        path = self._binary_tsv(tmp_path)
        out = tmp_path / "report.pdf"
        result = runner.invoke(app, ["analyze", str(path), "--pdf", str(out)])
        assert result.exit_code == 0
        assert out.is_file()
        assert out.read_bytes()[:5] == b"%PDF-"

    def test_writes_statistics_tsv(self, tmp_path) -> None:
        path = self._binary_tsv(tmp_path)
        out = tmp_path / "stats.tsv"
        result = runner.invoke(app, ["analyze", str(path), "--statistics-tsv", str(out)])
        assert result.exit_code == 0
        assert out.is_file()
        head = out.read_text().splitlines()[0]
        assert "Set_A" in head and "Jaccard" in head and "Significant" in head

    def test_writes_multiple_outputs(self, tmp_path) -> None:
        path = self._binary_tsv(tmp_path)
        venn_out = tmp_path / "v.svg"
        pdf_out = tmp_path / "r.pdf"
        result = runner.invoke(app, [
            "analyze", str(path),
            "--venn", str(venn_out),
            "--pdf", str(pdf_out),
        ])
        assert result.exit_code == 0
        assert venn_out.is_file()
        assert pdf_out.is_file()


class TestAnalyzeOutputDir:
    def test_output_dir_writes_full_bundle(self, tmp_path) -> None:
        path = tmp_path / "in.tsv"
        path.write_text("Title\tA\tB\nx\t1\t1\ny\t1\t0\nz\t0\t1\n")
        out_dir = tmp_path / "report"
        result = runner.invoke(app, ["analyze", str(path), "--output-dir", str(out_dir)])
        assert result.exit_code == 0
        assert (out_dir / "venn.svg").is_file()
        assert (out_dir / "upset.png").is_file()
        assert (out_dir / "network.png").is_file()
        assert (out_dir / "report.pdf").is_file()
        assert (out_dir / "statistics.tsv").is_file()

    def test_output_dir_creates_parents(self, tmp_path) -> None:
        path = tmp_path / "in.tsv"
        path.write_text("Title\tA\tB\nx\t1\t1\n")
        out_dir = tmp_path / "deep" / "nested" / "report"
        result = runner.invoke(app, ["analyze", str(path), "--output-dir", str(out_dir)])
        assert result.exit_code == 0
        assert out_dir.is_dir()


class TestRenderSampleCommand:
    def test_render_sample_summary(self) -> None:
        result = runner.invoke(app, ["render-sample", "dataset_real_cancer_drivers_4"])
        assert result.exit_code == 0
        assert "OncoKB" in result.stdout or "Vogelstein" in result.stdout

    def test_render_sample_writes_pdf(self, tmp_path) -> None:
        out = tmp_path / "sample.pdf"
        result = runner.invoke(app, [
            "render-sample", "dataset_mock_streaming_platforms",
            "--pdf", str(out),
        ])
        assert result.exit_code == 0
        assert out.is_file()
        assert out.read_bytes()[:5] == b"%PDF-"

    def test_unknown_sample_errors(self) -> None:
        result = runner.invoke(app, ["render-sample", "no-such-sample"])
        assert result.exit_code != 0


class TestCliStatisticsTsvFormat:
    def test_statistics_tsv_uses_full_pairwise_format(self, tmp_path) -> None:
        out = tmp_path / "stats.tsv"
        result = runner.invoke(app, [
            "render-sample", "dataset_real_cancer_drivers_4",
            "--statistics-tsv", str(out),
        ])
        assert result.exit_code == 0, result.output
        header = out.read_text(encoding="utf-8").split("\n")[0]
        assert header == (
            "Set_A\tSet_B\tName_A\tName_B\tSize_A\tSize_B\t"
            "Intersection\tUnion\tJaccard\tOverlap_Coeff\tDice\t"
            "Expected\tFold_Enrichment\tP_value\tFDR\t"
            "Bonferroni\tP_two_sided\t"
            "Jaccard_CI_low\tJaccard_CI_high\tDice_CI_low\tDice_CI_high\t"
            "Significant"
        )


class TestCliErrorHandling:
    def test_missing_input_prints_friendly_error(self, tmp_path) -> None:
        nonexistent = tmp_path / "does-not-exist.tsv"
        result = runner.invoke(app, ["analyze", str(nonexistent)])
        assert result.exit_code == 1
        # Should be a friendly "error: ..." line, not a Python traceback.
        # Combine stdout + stderr (Typer routes stderr via secho).
        combined = (result.stdout or "") + (result.output or "")
        assert "error" in combined.lower()
        # Should NOT contain a Python traceback header.
        assert "Traceback" not in combined
