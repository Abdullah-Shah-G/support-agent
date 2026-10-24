import json
import os
import subprocess
import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
import main
import sessions


class AppTests(unittest.TestCase):
    def setUp(self):
        sessions.sessions.clear()
        sessions.ticket_store.clear()
        self.client = TestClient(main.app)
        self.ticket = dict(title='Export fails', description='Cannot export', priority='high', customer_email='test@example.com')

    def chat(self, ticket):
        reply = 'ACTION:' + json.dumps(dict(action='create_ticket', ticket=ticket)) + '\nPlease confirm {these details}.'
        with patch.object(main, 'generate_reply', new=AsyncMock(return_value=reply)):
            return self.client.post('/api/chat', json=dict(session_id='test', message='Help'))

    def test_confirmation_is_validated_and_idempotent(self):
        payload = dict(session_id='test', confirmed=True)
        self.assertEqual(self.client.put('/api/chat', json=payload).status_code, 409)
        result = self.chat(self.ticket)
        self.assertEqual(result.json()['stage'], 'confirming')
        first = self.client.put('/api/chat', json=payload)
        second = self.client.put('/api/chat', json=payload)
        self.assertEqual(first.json()['ticket_id'], second.json()['ticket_id'])
        self.assertEqual(len(sessions.ticket_store), 1)
        self.assertEqual(self.client.put('/api/chat', json=dict(session_id='test', confirmed=False)).status_code, 409)

    def test_invalid_model_output_cannot_confirm(self):
        for ticket in ({}, dict(self.ticket, priority='urgent'), dict(self.ticket, customer_email='invalid'), ['unexpected']):
            self.assertEqual(self.chat(ticket).json()['stage'], 'collecting')
            self.assertEqual(self.client.put('/api/chat', json=dict(session_id='test', confirmed=True)).status_code, 409)

    @patch.dict(os.environ, {'ADMIN_TOKEN': 'test-admin'})
    def test_admin_endpoints(self):
        self.assertEqual(self.client.get('/api/tickets').status_code, 401)
        self.assertEqual(self.client.post('/api/webhooks/tickets', json={'ticket_json': self.ticket}).status_code, 401)
        headers = {'Authorization': 'Bearer test-admin'}
        self.assertEqual(self.client.post('/api/webhooks/tickets', json={'ticket_json': {}}, headers=headers).status_code, 422)
        self.assertEqual(self.client.post('/api/webhooks/tickets', json={'ticket_json': self.ticket}, headers=headers).status_code, 201)

    def test_bounded_history_and_browser_script(self):
        for n in range(20):
            sessions.add_message('test', 'user', str(n))
        self.assertEqual(len(sessions.sessions['test']['messages']), 10)
        script = main.render('index.html').split('<script>')[1].split('</script>')[0]
        result = subprocess.run(['node', '--check'], input=script, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
