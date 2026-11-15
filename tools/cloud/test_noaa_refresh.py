"""Recovery at the cloud input boundary, with a real archive and injected transport."""
import hashlib
from http.client import IncompleteRead
import io
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch

import refresh

URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json'
GOOD = b'[{"time_tag":"2026-11-15T12:00:00","kp":2,"observed":"predicted"}]\r\n'
BAD = GOOD + b'[]'


def verify_receipt(root, retrieved):
    archive = root / 'outputs/kp_raw_archive'
    link = json.loads((root / 'future_kp.json').read_bytes())['source_receipts'][URL]
    receipt = json.loads((archive / link['receipt']).read_bytes())
    data = (archive / receipt['body']).read_bytes()
    assert receipt['url'] == URL and receipt['retrieved_at'] == retrieved.isoformat()
    assert hashlib.sha256(data).hexdigest() == receipt['sha256'] == link['sha256']
    return object(), None


class NoaaRefreshTest(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.sleep = self.enterContext(patch.object(refresh, 'sleep'))
        self.diagnostics = self.enterContext(patch('sys.stderr', new_callable=io.StringIO))

    def test_extra_json_retried_and_only_exact_accepted_bytes_archived(self):
        transport = Mock(side_effect=[BAD, GOOD])
        loader = Mock(side_effect=verify_receipt)
        refresh.refresh_short_range(self.root, URL, loader, transport)
        self.assertEqual(transport.call_count, 2)
        loader.assert_called_once()
        receipt_file = self.root / 'outputs/kp_raw_archive/receipts/cloud.json'
        receipt = json.loads(receipt_file.read_bytes())
        self.assertEqual((receipt_file.parent.parent / receipt['body']).read_bytes(), GOOD)
        self.assertEqual(list(receipt_file.parent.parent.glob('bodies/*.json')),
                         [receipt_file.parent.parent / receipt['body']])
        rejected = json.loads(self.diagnostics.getvalue())
        self.assertIn('Extra data', rejected['reason'])
        self.assertEqual(rejected['sha256'], hashlib.sha256(BAD).hexdigest())
        self.sleep.assert_called_once_with(1)

    def test_transport_failure_and_protocol_failure_share_bounded_attempts(self):
        transport = Mock(side_effect=[IncompleteRead(b'['), GOOD.replace(b'"kp":2', b'"kp":99'), GOOD])
        loader = Mock(side_effect=[(None, 'Invalid slot'), (object(), None)])
        refresh.refresh_short_range(self.root, URL, loader, transport)
        self.assertEqual(transport.call_count, 3)
        self.assertEqual(loader.call_count, 2)
        self.assertEqual([call.args[0] for call in self.sleep.call_args_list], [1, 2])
        self.assertEqual(len(self.diagnostics.getvalue().splitlines()), 2)

    def test_exhaustion_preserves_previous_receipt_and_pointer(self):
        previous = self.root / 'future_kp.json'
        previous.write_bytes(b'previous receipt reference')
        transport = Mock(side_effect=[b'{"bad":"shape"}', b'[{"time_tag": 3}]', BAD])
        loader = Mock()
        with self.assertRaisesRegex(ValueError, 'after 3 attempts.*Extra data'):
            refresh.refresh_short_range(self.root, URL, loader, transport)
        self.assertEqual(previous.read_bytes(), b'previous receipt reference')
        self.assertFalse((self.root / 'outputs').exists())
        loader.assert_not_called()
        self.assertEqual(transport.call_count, 3)

    def test_fetch_requests_revalidation_and_keeps_byte_limit(self):
        with patch.object(refresh, 'urlopen') as open_url:
            response = open_url.return_value.__enter__.return_value
            response.read.return_value = GOOD
            self.assertEqual(refresh.fetch(URL), GOOD)
            request = open_url.call_args.args[0]
            self.assertEqual(request.headers['Cache-control'], 'no-cache')
            self.assertEqual(request.headers['Accept'], 'application/json')
            self.assertEqual(open_url.call_args.kwargs['timeout'], 35)
            response.read.assert_called_once_with(1_000_001)
            response.read.return_value = b'[' * 1_000_001
            with self.assertRaisesRegex(ValueError, 'Oversized source'):
                refresh.fetch(URL)


if __name__ == '__main__':
    unittest.main()
