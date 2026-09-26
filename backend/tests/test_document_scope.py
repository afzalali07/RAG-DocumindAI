"""Document selection stays enforced across retrieval, tools and conversation history."""
import json

import pytest

from app.core import rag, vectorstore
from app.core.agent_tools import run_tool
from app.db.models import Document
from app.db.session import SessionLocal


@pytest.fixture
def scope_docs(client):
    with SessionLocal() as db:
        docs = [Document(filename=f'scope-{i}.pdf', content_type='application/pdf', status=status)
                for i, status in enumerate(['ready', 'ready', 'processing'])]
        db.add_all(docs)
        db.commit()
        ids = [doc.id for doc in docs]
    yield ids
    with SessionLocal() as db:
        for doc_id in ids:
            db.delete(db.get(Document, doc_id))
        db.commit()


def parse_events(response):
    return {frame.splitlines()[0][7:]: json.loads(frame.splitlines()[1][6:])
            for frame in response.text.split('\n\n') if frame.strip()}


def test_scoped_search_and_sources(client, scope_docs, monkeypatch):
    def query(**kwargs):
        assert kwargs['document_ids'] == [scope_docs[0]]
        return [{'document_id': scope_docs[0], 'filename': 'scope-0.pdf', 'page': 2,
                 'label': 'Page 2', 'text': 'Selected file only', 'score': .9}]
    monkeypatch.setattr(vectorstore, 'query', query)
    response = client.get('/api/search', params={'q': 'test', 'document_ids': scope_docs[0]})
    assert response.status_code == 200
    assert response.json()['results'][0]['document_id'] == scope_docs[0]
    assert response.json()['results'][0]['label'] == 'Page 2'


def test_agent_list_and_search_keep_scope(scope_docs, monkeypatch):
    with SessionLocal() as db:
        text, _ = run_tool('list_documents', {}, db=db, category=None,
                           document_ids=[scope_docs[0]], top_k=3)
        assert [doc['id'] for doc in json.loads(text)] == [scope_docs[0]]
        def retrieve(**kwargs):
            assert kwargs['document_ids'] == [scope_docs[0]]
            return []
        monkeypatch.setattr(rag, 'retrieve', retrieve)
        run_tool('search_documents', {'query': 'test', 'document_ids': [scope_docs[1]]},
                 db=db, category=None, document_ids=[scope_docs[0]], top_k=3)


def test_rag_scope_saved_and_cannot_change_in_same_conversation(client, scope_docs, monkeypatch):
    def retrieve(**kwargs):
        assert kwargs['document_ids'] == [scope_docs[0]]
        return []
    monkeypatch.setattr(rag, 'retrieve', retrieve)
    request = {'message': 'test', 'model': 'mock', 'mode': 'rag', 'document_ids': [scope_docs[0]]}
    response = client.post('/api/chat', json=request)
    assert response.status_code == 200
    cid = parse_events(response)['done']['conversation_id']
    detail = client.get(f'/api/conversations/{cid}').json()
    assert detail['document_ids'] == [scope_docs[0]]
    response = client.post('/api/chat', json={**request, 'conversation_id': cid, 'document_ids': [scope_docs[1]]})
    assert response.status_code == 409
    response = client.post('/api/chat', json={**request, 'conversation_id': cid, 'document_ids': None})
    assert response.status_code == 409
    response = client.post('/api/chat', json={**request, 'conversation_id': cid})
    assert response.status_code == 200


@pytest.mark.parametrize('mode', ['rag', 'agent'])
def test_chat_rejects_invalid_selection(client, scope_docs, mode):
    for ids, expected in [([], 422), (['missing'], 404), ([scope_docs[2]], 409)]:
        response = client.post('/api/chat', json={'message': 'test', 'mode': mode, 'document_ids': ids})
        assert response.status_code == expected


def test_search_rejects_invalid_selection(client, scope_docs):
    for value, expected in [('', 422), ('missing', 404), (scope_docs[2], 409)]:
        response = client.get('/api/search', params={'q': 'test', 'document_ids': value})
        assert response.status_code == expected
