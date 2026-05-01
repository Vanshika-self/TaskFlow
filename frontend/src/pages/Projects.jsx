import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Plus, Users, ListTodo, ChevronRight } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = () => {
    api.get('/projects')
      .then((res) => setProjects(res.data.projects))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/projects', form);
      setProjects([res.data.project, ...projects]);
      setShowModal(false);
      setForm({ name: '', description: '' });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <h1>Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New project
        </button>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty">
            <h3>No projects yet</h3>
            <p>Create your first project to get started</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create project
            </button>
          </div>
        ) : (
          <div className="card-grid">
            {projects.map((p) => (
              <Link to={`/projects/${p.id}`} key={p.id} style={{ display: 'block' }}>
                <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: stringToColor(p.name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 600, color: '#fff',
                      }}
                    >
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className={`badge badge-${p.role}`}>{p.role}</span>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{p.name}</h3>
                  {p.description && (
                    <p className="text-muted text-sm truncate" style={{ marginBottom: 14 }}>
                      {p.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-muted text-sm" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <span className="flex items-center gap-2">
                      <Users size={13} /> {p.member_count}
                    </span>
                    <span className="flex items-center gap-2">
                      <ListTodo size={13} /> {p.task_count} tasks
                    </span>
                    <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create project modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New project</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Project name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Website Redesign"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What's this project about?"
                />
              </div>
              <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Give each project a consistent color based on its name
function stringToColor(str) {
  const colors = ['#5b7bff', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
