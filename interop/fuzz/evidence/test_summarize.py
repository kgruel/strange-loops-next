import importlib.util
import pathlib
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'summarize.py'
spec = importlib.util.spec_from_file_location('summarize', SCRIPT)
assert spec is not None and spec.loader is not None
summarize = importlib.util.module_from_spec(spec)
spec.loader.exec_module(summarize)


def summary():
    return {'requested': 1, 'counts': {'record': {'cases': 1, 'match': 1,
        'protocol-refusal': 0, 'decoder-refusal': 0, 'mismatch': 0}},
        'mismatches': 0, 'decoderRefusals': 0, 'protocolRefusals': 0,
        'refusalCodes': {}, 'shrinkTrials': 0}


class EvidenceTest(unittest.TestCase):
    def test_mismatch_import_rejected(self):
        value = summary()
        value['counts']['record']['match'] = 0
        value['counts']['record']['mismatch'] = value['mismatches'] = 1
        with tempfile.TemporaryDirectory() as directory:
            raw = pathlib.Path(directory)
            summarize.write(raw / 'summary.json', value)
            with self.assertRaisesRegex(ValueError, 'mismatches'):
                summarize.import_campaign(raw, 'test')

    def test_category_sum_rejected(self):
        value = summary()
        value['counts']['record']['match'] += 1
        with self.assertRaises(ValueError):
            summarize.totals(value)

    def test_histogram_validation(self):
        value = summary()
        value['refusalCodes'] = {'not-a-code': 1}
        with self.assertRaises(ValueError):
            summarize.totals(value)
        value['refusalCodes'] = {'kind-empty': 0}
        with self.assertRaises(ValueError):
            summarize.totals(value)

    def test_guard_finding_validation(self):
        ok = {'status': 'ok', 'code': 0, 'signal': None, 'error': None}
        artifact = {'baseline': {'build': ok, 'gen': ok, 'changedPaths': []}, 'finalBaseline': ok,
                    'mutants': [{'id': 'lens', 'status': 'killed-by-guard', 'commands': [ok, ok],
                                 'failureDetail': 'source shape differs'}]}
        self.assertEqual(summarize.mutation_report(artifact)['outcomes']['killed-by-guard'], 1)
        del artifact['mutants'][0]['failureDetail']
        with self.assertRaisesRegex(ValueError, 'guard finding'):
            summarize.mutation_report(artifact)

    def test_retained_artifacts(self):
        report = summarize.report()
        self.assertEqual(len(report['campaigns']), 1)
        self.assertEqual(len(report['mutations']), 1)
        campaign = report['campaigns']['ratchets-1']
        self.assertEqual(campaign['totals']['cases'], 5600)
        self.assertEqual(campaign['totals']['mismatch'], 0)
        self.assertEqual(len(campaign['refusalCodes']), 30)
        mutation = report['mutations']['mutations-ratchets-1']
        self.assertEqual(mutation['total'], 197)
        self.assertEqual(mutation['outcomes'], {'error': 16, 'killed-by-vector': 27,
            'killed-by-guard': 1, 'rejected-by-build': 147, 'survived': 6})
        self.assertEqual(mutation['guards']['ratchets-lens-base-remove'], 'rejected-by-build')
        self.assertEqual(mutation['guards']['ratchets-lens-base-after-parse'], 'killed-by-guard')

    def test_infrastructure_failure_rejected(self):
        paths = list(summarize.MUTATIONS.glob('*/summary.json'))
        self.assertEqual(len(paths), 1)
        artifact = summarize.read(paths[0])
        artifact['mutants'][0]['commands'][0]['signal'] = 'SIGTERM'
        with self.assertRaises(ValueError):
            summarize.mutation_report(artifact)
        artifact['mutants'][0]['commands'][0]['signal'] = None
        artifact['mutants'][0]['commands'][0]['status'] = 'timeout'
        with self.assertRaises(ValueError):
            summarize.mutation_report(artifact)


if __name__ == '__main__':
    unittest.main()
