import copy
import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'summarize.py'
spec = importlib.util.spec_from_file_location('summarize', SCRIPT)
assert spec is not None and spec.loader is not None
summarize = importlib.util.module_from_spec(spec)
spec.loader.exec_module(summarize)


class EvidenceTest(unittest.TestCase):
    def test_historical_artifacts(self):
        result = summarize.report()
        self.assertEqual(result['campaigns']['step1-1']['totals']['mismatch'], 42)
        self.assertEqual(result['mutations']['mutations-fixes']['total'], 196)

    def test_category_sum_rejected(self):
        summary = summarize.read(summarize.CAMPAIGNS / 'step1-1/summary.json')
        summary['counts']['lens']['match'] += 1
        with self.assertRaises(ValueError):
            summarize.totals(summary)

    def test_new_d1_example_rejected(self):
        path = summarize.CAMPAIGNS / 'step1-1'
        summary = summarize.read(path / 'summary.json')
        data = summarize.read(path / 'd1-mismatches.json')
        reference = copy.deepcopy(data['examples'])
        data['examples']['raw']['input']['text'] = ['different']
        with self.assertRaises(ValueError):
            summarize.validate_cases(summary, data, reference)

    def test_infrastructure_failure_rejected(self):
        artifact = summarize.read(summarize.MUTATIONS / 'mutations-fixes/summary.json')
        artifact['mutants'][0]['commands'][0]['signal'] = 'SIGTERM'
        with self.assertRaises(ValueError):
            summarize.mutation_report(artifact)
        artifact['mutants'][0]['commands'][0]['signal'] = None
        artifact['mutants'][0]['commands'][0]['status'] = 'timeout'
        with self.assertRaises(ValueError):
            summarize.mutation_report(artifact)


if __name__ == '__main__':
    unittest.main()
