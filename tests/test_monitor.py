import csv
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import monitor

class MonitorTests(unittest.TestCase):
    def test_real_markup_duplicates_sauna(self):
        html = '<li>Plaváreň: <strong>141 osôb</strong><sup>*</sup></li>'
        self.assertEqual(monitor.parse_occupancy(html * 2 + '<li>Saunový svet: 9 osôb</li>'), 141)

    def test_zero_and_capacity_exceeded(self):
        for value in [0, 1, 175]:
            self.assertEqual(monitor.parse_occupancy(f'Plaváreň: {value}&nbsp;osôb'), value)

    def test_missing_conflicting_and_script(self):
        for html in ['kapacita 160 osôb', 'Plaváreň: 3 osôb Plaváreň: 4 osôb', '<script>Plaváreň: 9 osôb</script>']:
            with self.assertRaises(ValueError):
                monitor.parse_occupancy(html)

    def test_csv_append_error_and_dst(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'data.csv'
            monitor.append_row(path, 0, now=datetime(2026, 7, 1, 10, tzinfo=timezone.utc))
            monitor.append_row(path, error='Sieť, nedostupná', now=datetime(2026, 12, 1, 10, tzinfo=timezone.utc))
            with path.open() as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]['occupancy'], '0')
            self.assertTrue(rows[0]['timestamp_bratislava'].endswith('+02:00'))
            self.assertTrue(rows[1]['timestamp_bratislava'].endswith('+01:00'))
            self.assertEqual(rows[1]['occupancy'], '')
            self.assertEqual(rows[1]['status'], 'error')

    def test_failure_saved_and_nonzero_exit(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'data.csv'
            with patch('sys.argv', ['monitor.py', '--output', str(path)]), patch('monitor.fetch_occupancy', side_effect=RuntimeError('Test výpadku')):
                self.assertEqual(monitor.main(), 1)
            with path.open() as handle:
                self.assertEqual(list(csv.DictReader(handle))[0]['status'], 'error')

if __name__ == '__main__':
    unittest.main()
