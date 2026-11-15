"""Recovery at the cloud input boundary, with a real archive and injected transport."""
import hashlib
from http.client import IncompleteRead
import io
import json
import os
import socket
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch
from urllib.error import URLError

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
        self.enterContext(patch.dict(os.environ, {}, clear=False))
        os.environ.pop(refresh.REJECTED_DIR_ENV, None)

    def lines(self, status=None):
        rows = [json.loads(line) for line in self.diagnostics.getvalue().splitlines()]
        return [row for row in rows if status is None or row['status'] == status]

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
        [rejected] = self.lines('rejected')
        self.assertIn('Extra data', rejected['reason'])
        self.assertEqual(rejected['sha256'], hashlib.sha256(BAD).hexdigest())
        self.assertEqual(rejected['stage'], 'shape')
        # The excerpt starts before the second document and the error offset points at it.
        self.assertEqual(rejected['decode']['error_offset'], len(GOOD.rstrip()) + 2)
        self.assertIn(b'[]'.hex(), rejected['decode']['excerpt_hex'])
        self.assertEqual(self.lines('accepted')[0]['attempt'], 2)
        self.sleep.assert_called_once_with(1)

    def test_transport_failure_and_protocol_failure_share_bounded_attempts(self):
        transport = Mock(side_effect=[IncompleteRead(b'['), GOOD.replace(b'"kp":2', b'"kp":99'), GOOD])
        loader = Mock(side_effect=[(None, 'Invalid slot'), (object(), None)])
        refresh.refresh_short_range(self.root, URL, loader, transport)
        self.assertEqual(transport.call_count, 3)
        self.assertEqual(loader.call_count, 2)
        self.assertEqual([call.args[0] for call in self.sleep.call_args_list], [1, 2])
        self.assertEqual([row['stage'] for row in self.lines('rejected')], ['transport', 'protocol'])
        self.assertEqual(len(self.lines('accepted')), 1)

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

    def test_duplicate_slot_is_rejected_before_the_protocol(self):
        row = b'{"time_tag":"2026-11-15T12:00:00","kp":2,"observed":"predicted"}'
        duplicated = b'[' + row + b',' + row + b']'
        transport = Mock(side_effect=[duplicated, GOOD])
        loader = Mock(side_effect=verify_receipt)
        refresh.refresh_short_range(self.root, URL, loader, transport)
        loader.assert_called_once()
        [rejected] = self.lines('rejected')
        self.assertIn('Duplicate NOAA slot 2026-11-15T12:00:00', rejected['reason'])

    def test_equivalent_timestamps_are_the_same_slot(self):
        row = GOOD.rstrip().removeprefix(b'[').removesuffix(b']')
        alias = row.replace(b'12:00:00', b'14:00:00+02:00')
        raw = b'[' + row + b',' + alias + b']'
        with self.assertRaisesRegex(ValueError, 'Duplicate NOAA slot.*12:00:00'):
            refresh.validate_slots(raw)

    def test_decode_offset_is_a_byte_index_with_bom_and_non_ascii(self):
        raw = b'\xef\xbb\xbf' + b'["' + 'Київ'.encode() + b'"] []'
        with self.assertRaises(json.JSONDecodeError) as failure:
            refresh.validate_slots(raw)
        detail = refresh.diagnostic(raw, failure.exception)
        self.assertEqual(detail['error_offset'], raw.index(b'[]'))

    def test_short_content_length_body_is_rejected_even_if_valid_json(self):
        with patch.object(refresh, 'urlopen') as open_url:
            bad = Mock(status=200, headers={'Content-Length': str(len(GOOD) + 10), 'ETag': '"test"'})
            bad.read.return_value = GOOD
            good = Mock(status=200, headers={'Content-Length': str(len(GOOD))})
            good.read.return_value = GOOD
            open_url.return_value.__enter__.side_effect = [bad, good]
            kept = self.root / 'rejected'
            os.environ[refresh.REJECTED_DIR_ENV] = str(kept)
            loader = Mock(side_effect=verify_receipt)
            refresh.refresh_short_range(self.root, URL, loader)
        loader.assert_called_once()
        [failure] = self.lines('rejected')
        self.assertEqual(failure['stage'], 'transport')
        self.assertIn('IncompleteRead', failure['reason'])
        self.assertEqual(failure['transport']['headers']['ETag'], '"test"')
        self.assertEqual(Path(failure['kept']).read_bytes(), GOOD)
        self.assertEqual(self.lines('accepted')[0]['attempt'], 2)

    def test_diagnostic_write_failure_cannot_abort_recovery(self):
        transport = Mock(side_effect=[BAD, GOOD])
        with patch.object(refresh, 'keep_rejected', side_effect=PermissionError('test')):
            refresh.refresh_short_range(self.root, URL, verify_receipt, transport)
        self.assertIn('PermissionError', self.lines('rejected')[0]['keep_error'])
        self.assertEqual(self.lines('accepted')[0]['attempt'], 2)

    def test_timeouts_and_protocol_exception_fail_closed_and_keep_bodies_outside_publication(self):
        kept = self.root / 'rejected'
        os.environ[refresh.REJECTED_DIR_ENV] = str(kept)
        transport = Mock(side_effect=[socket.timeout('timed out'), URLError(TimeoutError('connect')), GOOD])
        loader = Mock(side_effect=KeyError('kp'))
        with self.assertRaisesRegex(ValueError, 'after 3 attempts.*KeyError'):
            refresh.refresh_short_range(self.root, URL, loader, transport)
        self.assertEqual([row['stage'] for row in self.lines('rejected')], ['transport', 'transport', 'protocol'])
        self.assertIn('TimeoutError', self.lines('rejected')[0]['reason'])
        self.assertFalse((self.root / 'outputs').exists())
        self.assertFalse((self.root / 'future_kp.json').exists())
        bodies = list(kept.glob('*.body'))
        self.assertEqual([body.read_bytes() for body in bodies], [GOOD])
        self.assertEqual(json.loads(bodies[0].with_suffix('.json').read_text())['stage'], 'protocol')

    def test_fetch_requests_revalidation_and_keeps_byte_limit(self):
        with patch.object(refresh, 'urlopen') as open_url:
            response = open_url.return_value.__enter__.return_value
            response.read.return_value = GOOD
            response.status = 200
            response.headers = {'Content-Length': str(len(GOOD)), 'Transfer-Encoding': None}
            self.assertEqual(refresh.fetch(URL), GOOD)
            self.assertEqual(refresh.LAST_RESPONSE, {'status': 200, 'headers': {'Content-Length': str(len(GOOD))}})
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
