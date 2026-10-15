import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container, Form, Row, Col } from 'react-bootstrap';
import api from './api';
import { useApp } from './context';
import { Avatar } from './pages';

function PostCard({ p, reload }) {
  const { user } = useApp();
  const [text, setText] = useState('');
  const send = async e => {
    e.preventDefault();
    if (!text) return;
    await api.post(`/posts/${p._id}/comments`, { text });
    setText('');
    reload();
  };
  return (
    <article className="card-box p-4 mb-4 post-card">
      <div className="d-flex align-items-center gap-2 mb-3">
        <Avatar u={p.author} />
        <div className="flex-grow-1">
          <b>{p.author?.name}</b>{' '}
          <span className="badge-cat role-badge">{p.author?.role}</span>
          <br />
          <small className="text-muted">{new Date(p.createdAt).toLocaleString()}</small>
        </div>
        <div className="d-flex gap-2">
          {user && user._id !== p.author?._id && (
            <Link to={`/messages?to=${p.author?._id}`} className="btn btn-sm btn-outline-gold">Message</Link>
          )}
          {user && (user.role === 'admin' || user._id === p.author?._id) && (
            <button type="button" className="btn btn-sm btn-outline-danger" aria-label="Delete post" onClick={async () => { await api.delete('/posts/' + p._id); reload(); }}>✕</button>
          )}
        </div>
      </div>
      <p className="post-text">{p.text}</p>
      {p.image && <img src={p.image} className="post-img" alt="" />}
      {!!p.comments.length && (
        <div className="post-comments mt-3">
          <small className="text-muted text-uppercase fw-semibold comments-label">Comments</small>
          {p.comments.map(c => (
            <div key={c._id} className="comment"><b>{c.user?.name}</b> {c.text}</div>
          ))}
        </div>
      )}
      {user && (
        <Form onSubmit={send} className="d-flex gap-2 mt-3">
          <Form.Control size="sm" placeholder="Write a comment…" value={text} onChange={e => setText(e.target.value)} />
          <button type="submit" className="btn btn-sm btn-gold">Post</button>
        </Form>
      )}
    </article>
  );
}

export function Community() {
  const { user } = useApp();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const load = () => api.get('/posts').then(r => setPosts(r.data));
  useEffect(() => { load(); }, []);
  const submit = async e => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('text', text);
    if (file) fd.append('image', file);
    await api.post('/posts', fd);
    setText('');
    setFile(null);
    e.target.reset();
    load();
  };
  return (
    <>
      <div className="page-hero-bar page-hero-bar--compact">
        <Container>
          <div className="page-header mb-0">
            <span className="section-eyebrow text-white-50">Connect</span>
            <h1 className="page-title serif">Community</h1>
            <p className="page-sub">Share work, trade ideas, and connect with artists and collectors.</p>
          </div>
        </Container>
      </div>
      <Container className="pb-5 community-feed">
        {user ? (
          <Form onSubmit={submit} className="card-box p-4 mb-4 post-composer">
            <h6 className="serif mb-3">Start a conversation</h6>
            <Form.Control as="textarea" rows={3} placeholder="Share an idea or an artwork…" value={text} onChange={e => setText(e.target.value)} required />
            <div className="d-flex flex-wrap gap-2 mt-3 align-items-center">
              <Form.Control type="file" className="composer-file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
              <button type="submit" className="btn btn-gold ms-auto">Publish post</button>
            </div>
          </Form>
        ) : (
          <div className="card-box p-4 mb-4 text-center">
            <p className="mb-2 text-muted">Join the conversation with fellow collectors and creators.</p>
            <Link to="/auth" className="btn btn-gold btn-sm">Log in to post</Link>
          </div>
        )}
        {posts.map(p => <PostCard key={p._id} p={p} reload={load} />)}
        {!posts.length && (
          <div className="empty-state"><p>No posts yet — be the first to share.</p></div>
        )}
      </Container>
    </>
  );
}

export function Messages() {
  const { user } = useApp();
  const [sp, setSp] = useSearchParams();
  const to = sp.get('to');
  const [convos, setConvos] = useState([]);
  const [thread, setThread] = useState([]);
  const [peer, setPeer] = useState(null);
  const [text, setText] = useState('');
  const end = useRef();
  const loadC = () => api.get('/messages').then(r => setConvos(r.data));
  const loadT = () => to && api.get('/messages/' + to).then(r => setThread(r.data));
  useEffect(() => { loadC(); }, []);
  useEffect(() => {
    if (!to) return;
    api.get('/users/' + to).then(r => setPeer(r.data.user));
    loadT();
    const t = setInterval(loadT, 4000);
    return () => clearInterval(t);
  }, [to]);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [thread]);
  const send = async e => {
    e.preventDefault();
    if (!text) return;
    await api.post('/messages/' + to, { text });
    setText('');
    loadT();
    loadC();
  };
  return (
    <>
      <div className="page-hero-bar page-hero-bar--compact">
        <Container>
          <div className="page-header mb-0">
            <span className="section-eyebrow text-white-50">Inbox</span>
            <h1 className="page-title serif">Messages</h1>
            <p className="page-sub">Direct conversations with artists and collectors.</p>
          </div>
        </Container>
      </div>
      <Container className="pb-5">
        <Row className="g-4 messages-layout">
          <Col md={4}>
            <div className="card-box convo-list">
              <div className="convo-list-head">Conversations</div>
              {convos.map(c => (
                <div
                  key={c.user._id}
                  role="button"
                  tabIndex={0}
                  className={'convo' + (to === String(c.user._id) ? ' on' : '')}
                  onClick={() => setSp({ to: String(c.user._id) })}
                  onKeyDown={ev => ev.key === 'Enter' && setSp({ to: String(c.user._id) })}
                >
                  <Avatar u={c.user} />
                  <div className="min-w-0">
                    <b className="text-truncate d-block">{c.user.name}</b>
                    <small className="text-muted text-truncate d-block">{c.last.slice(0, 40)}</small>
                  </div>
                </div>
              ))}
              {!convos.length && (
                <p className="p-3 text-muted mb-0 small">No conversations yet. Message an artist from their profile.</p>
              )}
            </div>
          </Col>
          <Col md={8}>
            <div className="card-box chat">
              {to ? (
                <>
                  <div className="chat-head">
                    <Avatar u={peer} size={36} />
                    <b>{peer?.name}</b>
                  </div>
                  <div className="chat-body">
                    {thread.map(m => (
                      <div key={m._id} className={'bubble ' + (String(m.from) === String(user._id) ? 'me' : '')}>{m.text}</div>
                    ))}
                    <div ref={end} />
                  </div>
                  <Form onSubmit={send} className="chat-compose d-flex gap-2">
                    <Form.Control placeholder="Type a message…" value={text} onChange={e => setText(e.target.value)} />
                    <button type="submit" className="btn btn-gold">Send</button>
                  </Form>
                </>
              ) : (
                <div className="chat-empty">
                  <p className="text-muted mb-0">Select a conversation to start chatting.</p>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
}
