import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { format, isPast, parseISO } from 'date-fns';
import { Plus, Trash2, UserPlus, X } from 'lucide-react';

const STATUS_COLS = [
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [userRole, setUserRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board'); // board | members
  const [taskModal, setTaskModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' });
  const [memberForm, setMemberForm] = useState({ email: '', role: 'member' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setUserRole(projRes.data.userRole);
      setTasks(taskRes.data.tasks);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  // Create task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...taskForm };
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.due_date) delete payload.due_date;
      const res = await api.post(`/projects/${id}/tasks`, payload);
      setTasks([...tasks, res.data.task]);
      setTaskModal(false);
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' });
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Update task status inline
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.patch(`/projects/${id}/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? res.data.task : t)));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete task (admin only)
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  // Add member
  const handleAddMember = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const res = await api.post(`/projects/${id}/members`, memberForm);
      setMembers([...members, res.data.member]);
      setMemberModal(false);
      setMemberForm({ email: '', role: 'member' });
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setMembers(members.filter((m) => m.id !== userId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 text-muted text-sm" style={{ marginBottom: 4 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/projects')}>Projects</span>
            <span>/</span>
            <span style={{ color: 'var(--text)' }}>{project?.name}</span>
          </div>
          <h1>{project?.name}</h1>
          {project?.description && (
            <p className="text-muted text-sm" style={{ marginTop: 4 }}>{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {userRole === 'admin' && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setMemberModal(true); setFormError(''); }}>
              <UserPlus size={14} /> Add member
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => { setTaskModal(true); setFormError(''); }}>
            <Plus size={14} /> Add task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 40px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 24 }}>
        {['board', 'members'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 14,
              fontWeight: activeTab === tab ? 500 : 400,
              cursor: 'pointer',
              transition: 'color 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {tab}
            {tab === 'board' && (
              <span className="kanban-count" style={{ marginLeft: 8 }}>{tasks.length}</span>
            )}
            {tab === 'members' && (
              <span className="kanban-count" style={{ marginLeft: 8 }}>{members.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="page-body">
        {/* Kanban board */}
        {activeTab === 'board' && (
          <div className="kanban">
            {STATUS_COLS.map((col) => {
              const colTasks = tasksByStatus(col.key);
              return (
                <div key={col.key} className="kanban-col">
                  <div className="kanban-col-header">
                    <span className="kanban-col-title">{col.label}</span>
                    <span className="kanban-count">{colTasks.length}</span>
                  </div>
                  <div className="kanban-tasks">
                    {colTasks.length === 0 && (
                      <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '20px 0' }}>
                        No tasks
                      </p>
                    )}
                    {colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        userRole={userRole}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  {userRole === 'admin' && <th></th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                          {m.name[0].toUpperCase()}
                        </div>
                        {m.name}
                      </div>
                    </td>
                    <td className="text-muted">{m.email}</td>
                    <td><span className={`badge badge-${m.role}`}>{m.role}</span></td>
                    <td className="text-muted">{format(parseISO(m.joined_at), 'MMM d, yyyy')}</td>
                    {userRole === 'admin' && (
                      <td>
                        {m.id !== project.owner_id && (
                          <button
                            className="btn btn-icon btn-danger btn-sm"
                            onClick={() => handleRemoveMember(m.id)}
                            title="Remove member"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add task modal */}
      {taskModal && (
        <div className="modal-overlay" onClick={() => setTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New task</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setTaskModal(false)}>✕</button>
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="What needs to be done?"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="More details..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assign to</label>
                <select
                  className="form-select"
                  value={taskForm.assigned_to}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Create task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add member modal */}
      {memberModal && (
        <div className="modal-overlay" onClick={() => setMemberModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add member</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setMemberModal(false)}>✕</button>
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">Email address *</label>
                <input
                  type="email"
                  className="form-input"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="teammate@example.com"
                  required
                  autoFocus
                />
                <p className="text-muted text-sm" style={{ marginTop: 6 }}>
                  They must already have a TaskFlow account
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                >
                  <option value="member">Member — can create and update tasks</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>
              <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Add member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function TaskCard({ task, userRole, onStatusChange, onDelete }) {
  const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date));

  return (
    <div className="task-card">
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="task-card-title" style={{ marginBottom: 0, flex: 1 }}>{task.title}</span>
        {userRole === 'admin' && (
          <button
            className="btn btn-icon"
            style={{ padding: 4, color: 'var(--text-dim)', background: 'none', border: 'none' }}
            onClick={() => onDelete(task.id)}
            title="Delete task"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {task.description && (
        <p className="text-muted text-sm" style={{ marginBottom: 10, fontSize: 12 }}>
          {task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}
        </p>
      )}

      <div className="task-card-meta">
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {task.due_date && (
          <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
            {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
        {task.assignee_name && (
          <span className="flex items-center gap-1">
            <span
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--accent)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', fontWeight: 600,
              }}
            >
              {task.assignee_name[0].toUpperCase()}
            </span>
            {task.assignee_name.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Quick status move */}
      <div style={{ marginTop: 10 }}>
        <select
          className="form-select"
          style={{ fontSize: 12, padding: '4px 8px' }}
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
        >
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>
    </div>
  );
}
