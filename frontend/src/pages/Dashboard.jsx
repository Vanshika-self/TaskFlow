import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { format, isPast, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, Folder } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  const { stats, overdueTasks, recentTasks } = data || {};

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            Here's what's happening across your projects
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">
              <Folder size={14} style={{ display: 'inline', marginRight: 4 }} />
              Projects
            </div>
            <div className="stat-value">{stats?.projectCount ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
              In Progress
            </div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              {stats?.myTasks?.in_progress ?? 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4 }} />
              Completed
            </div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {stats?.myTasks?.done ?? 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
              Overdue
            </div>
            <div className="stat-value" style={{ color: stats?.overdueCount > 0 ? 'var(--danger)' : 'inherit' }}>
              {stats?.overdueCount ?? 0}
            </div>
          </div>
        </div>

        {/* Overdue tasks */}
        {overdueTasks?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
              ⚠️ Overdue tasks
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overdueTasks.map((task) => (
                <Link
                  to={`/projects/${task.project_id}`}
                  key={task.id}
                  className="task-card"
                  style={{ display: 'block' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="task-card-title" style={{ marginBottom: 0 }}>{task.title}</span>
                    <span className="badge badge-overdue">
                      Overdue · {format(parseISO(task.due_date), 'MMM d')}
                    </span>
                  </div>
                  <p className="text-muted text-sm" style={{ marginTop: 4 }}>{task.project_name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Recent tasks</h2>
          {recentTasks?.length === 0 ? (
            <div className="empty">
              <h3>No tasks yet</h3>
              <p>Create a project and add some tasks to get started</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks?.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <Link to={`/projects/${task.project_id}`} style={{ fontWeight: 500 }}>
                          {task.title}
                        </Link>
                      </td>
                      <td className="text-muted">{task.project_name}</td>
                      <td>
                        <span className={`badge badge-${task.status}`}>
                          {formatStatus(task.status)}
                        </span>
                      </td>
                      <td className="text-muted">
                        {task.due_date ? (
                          <span style={{ color: isPastDue(task) ? 'var(--danger)' : undefined }}>
                            {format(parseISO(task.due_date), 'MMM d')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-muted">{task.assignee_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatStatus(s) {
  return { todo: 'To do', in_progress: 'In progress', done: 'Done' }[s] || s;
}

function isPastDue(task) {
  return task.status !== 'done' && task.due_date && isPast(parseISO(task.due_date));
}
