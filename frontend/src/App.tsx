import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

const API_URL = 'http://localhost:5000/api'

type Role = 'ADMIN' | 'MANAGER' | 'STAFF'

type User = {
  id: number
  name: string
  email: string
  role: Role
}

type Workshop = {
  id: number
  code: string
  title: string
  description?: string | null
  instructor: string
  location: string
  dateTime: string
  capacity: number
  status: string
  activeRegistrations: number
  seatsAvailable: number
}

type Registration = {
  id: number
  attendeeName: string
  attendeeEmail: string
  status: 'ACTIVE' | 'CANCELLED'
  registeredAt: string
  cancelledAt?: string | null
  registeredBy?: { name: string }
  cancelledBy?: { name: string } | null
}

type Page = 'workshops' | 'registrations' | 'users'

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.message ?? 'Request failed')
  }

  return body.data as T
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function toDateTimeInput(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') ?? '')
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) as User : null
  })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function handleLogin(nextToken: string, nextUser: User) {
    localStorage.setItem('token', nextToken)
    localStorage.setItem('user', JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken('')
    setUser(null)
  }

  if (!token || !user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Workshop Registration Service</p>
          <h1>Workshop desk</h1>
        </div>
        <div className="account">
          <span>{user.name} · {user.role}</span>
          <button className="button secondary" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="content">
        {(error || notice) && (
          <div className={error ? 'message error' : 'message success'}>
            {error || notice}
            <button onClick={() => { setError(''); setNotice('') }}>×</button>
          </div>
        )}
        <Dashboard
          token={token}
          user={user}
          onError={setError}
          onNotice={setNotice}
        />
      </main>
    </div>
  )
}

function Login({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [email, setEmail] = useState('admin@workshops.local')
  const [password, setPassword] = useState('Admin@12345')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Login failed')
      onLogin(body.data.token, body.data.user)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <p className="eyebrow">Staff portal</p>
        <h1>Sign in</h1>
        <p className="muted">Manage workshops and attendee registrations.</p>
        {error && <div className="message error">{error}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button className="button primary full-width" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="hint">Development Admin: admin@workshops.local / Admin@12345</p>
      </form>
    </main>
  )
}

function Dashboard({
  token,
  user,
  onError,
  onNotice,
}: {
  token: string
  user: User
  onError: (message: string) => void
  onNotice: (message: string) => void
}) {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [status, setStatus] = useState('')
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showWorkshopForm, setShowWorkshopForm] = useState(false)
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null)
  const [showUserForm, setShowUserForm] = useState(false)
  const [usersRefreshKey, setUsersRefreshKey] = useState(0)
  const [registrationRequested, setRegistrationRequested] = useState(false)
  const [page, setPage] = useState<Page>('workshops')

  async function loadWorkshops() {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (status) query.set('status', status)
      if (available) query.set('available', 'true')
      const data = await request<Workshop[]>(
        `/workshops${query.toString() ? `?${query}` : ''}`,
        token,
      )
      setWorkshops(data)
      if (selectedWorkshop) {
        const refreshed = data.find((workshop) => workshop.id === selectedWorkshop.id)
        setSelectedWorkshop(refreshed ?? null)
      }
    } catch (loadError) {
      onError(loadError instanceof Error ? loadError.message : 'Could not load workshops')
    } finally {
      setLoading(false)
    }
  }

  async function loadRegistrations(workshop: Workshop, openRegistration = false) {
    setRegistrationRequested(openRegistration)
    setSelectedWorkshop(workshop)
    try {
      const data = await request<Registration[]>(
        `/registrations/workshop/${workshop.id}`,
        token,
      )
      setRegistrations(data)
    } catch (loadError) {
      onError(loadError instanceof Error ? loadError.message : 'Could not load registrations')
    }
  }

  useEffect(() => {
    void loadWorkshops()
  }, [status, available])

  async function cancelRegistration(id: number) {
    try {
      await request(`/registrations/${id}/cancel`, token, { method: 'POST' })
      onNotice('Registration cancelled and the seat is available again.')
      if (selectedWorkshop) await loadRegistrations(selectedWorkshop)
      await loadWorkshops()
    } catch (cancelError) {
      onError(cancelError instanceof Error ? cancelError.message : 'Could not cancel registration')
    }
  }

  return (
    <>
      <nav className="page-nav card">
        <button className={page === 'workshops' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('workshops')}>
          Workshops
        </button>
        <button className={page === 'registrations' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('registrations')}>
          Registrations
        </button>
        {user.role === 'ADMIN' && (
          <button className={page === 'users' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('users')}>
            Users & permissions
          </button>
        )}
      </nav>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{user.role} workspace</p>
          <h2>
            {page === 'users' ? 'Manage staff accounts' : page === 'registrations' ? 'Registration history' : 'Find a workshop'}
          </h2>
        </div>
        <div className="actions">
          {user.role === 'ADMIN' && page === 'users' && (
            <button className="button primary" onClick={() => setShowUserForm(true)}>Create Manager / Staff</button>
          )}
          {user.role === 'MANAGER' && page === 'workshops' && (
            <button className="button primary" onClick={() => {
              setEditingWorkshop(null)
              setShowWorkshopForm(true)
            }}>Add workshop</button>
          )}
        </div>
      </section>

      {page === 'users' && user.role === 'ADMIN' ? (
        <UserManagement
          token={token}
          refreshKey={usersRefreshKey}
          onCreateUser={() => setShowUserForm(true)}
          onError={onError}
        />
      ) : (
      <>
      <section className="filters card">
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="FULL">Full</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} />
          Has available seats
        </label>
      </section>

      <div className={`workspace ${page === 'registrations' ? 'registrations-page' : ''}`}>
        <section className="workshop-list">
          {loading && <p className="muted">Loading workshops...</p>}
          {!loading && workshops.length === 0 && <div className="card empty">No workshops match these filters.</div>}
          {workshops.map((workshop) => (
            <article className={`card workshop-card ${selectedWorkshop?.id === workshop.id ? 'selected' : ''}`} key={workshop.id}>
              <div className="card-title">
                <div>
                  <span className="code">{workshop.code}</span>
                  <h3>{workshop.title}</h3>
                </div>
                <span className={`status ${workshop.status.toLowerCase()}`}>{workshop.status}</span>
              </div>
              <p className="muted">{workshop.description || 'No description provided.'}</p>
              <div className="details">
                <span>📅 {formatDate(workshop.dateTime)}</span>
                <span>📍 {workshop.location}</span>
                <span>👤 {workshop.instructor}</span>
              </div>
              <div className="capacity">
                <strong>{workshop.seatsAvailable}</strong> seats available of {workshop.capacity}
                <span>{workshop.activeRegistrations} registered</span>
              </div>
              <div className="card-actions">
                <button className="button secondary" onClick={() => void loadRegistrations(workshop)}>
                  {page === 'registrations' ? 'View history' : 'View registrations'}
                </button>
                {user.role === 'STAFF' && workshop.status === 'OPEN' && workshop.seatsAvailable > 0 && (
                  <button className="button primary" onClick={() => {
                    void loadRegistrations(workshop, true)
                  }}>
                    Register attendee
                  </button>
                )}
              </div>
              {user.role === 'MANAGER' && (
                <button className="text-button edit-button" onClick={() => {
                  setEditingWorkshop(workshop)
                  setShowWorkshopForm(true)
                }}>
                  Edit workshop
                </button>
              )}
            </article>
          ))}
        </section>

        <aside className="card details-panel">
          {!selectedWorkshop ? (
            <div className="empty">
              <h3>Select a workshop</h3>
              <p className="muted">Registration history will appear here.</p>
            </div>
          ) : (
            <>
              <div className="card-title">
                <div>
                  <p className="eyebrow">Registration history</p>
                  <h3>{selectedWorkshop.title}</h3>
                </div>
                {user.role === 'STAFF' && selectedWorkshop.seatsAvailable > 0 && selectedWorkshop.status === 'OPEN' && (
                  <RegistrationForm
                    key={`${selectedWorkshop.id}-${registrationRequested}`}
                    token={token}
                    workshopId={selectedWorkshop.id}
                    initialOpen={registrationRequested}
                    onDone={async () => {
                      onNotice('Attendee registered successfully.')
                      await loadRegistrations(selectedWorkshop)
                      await loadWorkshops()
                    }}
                    onError={onError}
                  />
                )}
              </div>
              {registrations.length === 0 && <p className="muted">No registrations yet.</p>}
              <div className="registration-list">
                {registrations.map((registration) => (
                  <div className="registration" key={registration.id}>
                    <div>
                      <strong>{registration.attendeeName}</strong>
                      <span>{registration.attendeeEmail}</span>
                      <small>
                        Registered {formatDate(registration.registeredAt)}
                        {registration.registeredBy ? ` by ${registration.registeredBy.name}` : ''}
                      </small>
                      {registration.status === 'CANCELLED' && (
                        <small className="cancelled">
                          Cancelled {registration.cancelledAt ? formatDate(registration.cancelledAt) : ''}
                          {registration.cancelledBy ? ` by ${registration.cancelledBy.name}` : ''}
                        </small>
                      )}
                    </div>
                    <div>
                      <span className={`status ${registration.status.toLowerCase()}`}>{registration.status}</span>
                      {user.role === 'STAFF' && registration.status === 'ACTIVE' && (
                        <button className="text-button" onClick={() => void cancelRegistration(registration.id)}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
      </>
      )}

      {showWorkshopForm && (
        <WorkshopForm
          token={token}
          workshop={editingWorkshop}
          onClose={() => {
            setShowWorkshopForm(false)
            setEditingWorkshop(null)
          }}
          onDone={async () => {
            setShowWorkshopForm(false)
            setEditingWorkshop(null)
            onNotice('Workshop created successfully.')
            await loadWorkshops()
          }}
          onError={onError}
        />
      )}
      {showUserForm && (
        <UserForm
          token={token}
          onClose={() => setShowUserForm(false)}
          onDone={() => {
            setShowUserForm(false)
            setUsersRefreshKey((current) => current + 1)
            onNotice('User created successfully.')
          }}
          onError={onError}
        />
      )}
    </>
  )
}

function UserManagement({
  token,
  refreshKey,
  onCreateUser,
  onError,
}: {
  token: string
  refreshKey: number
  onCreateUser: () => void
  onError: (message: string) => void
}) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request<User[]>('/users', token)
      .then(setUsers)
      .catch((loadError: unknown) => {
        onError(loadError instanceof Error ? loadError.message : 'Could not load users')
      })
      .finally(() => setLoading(false))
  }, [token, refreshKey, onError])

  if (loading) return <p className="muted">Loading users...</p>

  return (
    <section className="card users-panel">
      <div className="table-heading">
        <div>
          <p className="eyebrow">Admin only</p>
          <h3>Accounts and roles</h3>
          <p className="muted">Create the Manager and Staff accounts required by the centre.</p>
        </div>
        <div className="table-actions">
          <span className="muted">{users.length} account{users.length === 1 ? '' : 's'}</span>
          <button className="button primary" onClick={onCreateUser}>Create account</button>
        </div>
      </div>
      <div className="user-table">
        <div className="user-row user-header">
          <strong>Name</strong>
          <strong>Email</strong>
          <strong>Role</strong>
          <strong>Status</strong>
        </div>
        {users.map((account) => (
          <div className="user-row" key={account.id}>
            <span>{account.name}</span>
            <span>{account.email}</span>
            <span className="role-label">{account.role}</span>
            <span className="status open">ACTIVE</span>
          </div>
        ))}
      </div>
      <p className="hint">Only Admins can create accounts. The backend also rejects unauthorized role changes.</p>
    </section>
  )
}

function RegistrationForm({
  token,
  workshopId,
  initialOpen = false,
  onDone,
  onError,
}: {
  token: string
  workshopId: number
  initialOpen?: boolean
  onDone: () => Promise<void>
  onError: (message: string) => void
}) {
  const [open, setOpen] = useState(initialOpen)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await request(`/registrations/workshop/${workshopId}`, token, {
        method: 'POST',
        body: JSON.stringify({ attendeeName: name, attendeeEmail: email }),
      })
      setName('')
      setEmail('')
      setOpen(false)
      await onDone()
    } catch (submitError) {
      onError(submitError instanceof Error ? submitError.message : 'Could not register attendee')
    }
  }

  if (!open) return <button className="button primary" onClick={() => setOpen(true)}>Register attendee</button>

  return (
    <form className="inline-form" onSubmit={submit}>
      <input placeholder="Attendee name" value={name} onChange={(event) => setName(event.target.value)} required />
      <input type="email" placeholder="Attendee email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <button className="button primary">Save</button>
      <button type="button" className="button secondary" onClick={() => setOpen(false)}>Close</button>
    </form>
  )
}

function WorkshopForm({
  token,
  workshop,
  onClose,
  onDone,
  onError,
}: {
  token: string
  workshop?: Workshop | null
  onClose: () => void
  onDone: () => Promise<void>
  onError: (message: string) => void
}) {
  const [form, setForm] = useState(() => ({
    code: workshop?.code ?? '',
    title: workshop?.title ?? '',
    description: workshop?.description ?? '',
    instructor: workshop?.instructor ?? '',
    location: workshop?.location ?? '',
    dateTime: workshop ? toDateTimeInput(workshop.dateTime) : '',
    capacity: workshop ? String(workshop.capacity) : '10',
    status: workshop?.status ?? 'OPEN',
  }))

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await request(workshop ? `/workshops/${workshop.id}` : '/workshops', token, {
        method: workshop ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, capacity: Number(form.capacity), dateTime: new Date(form.dateTime).toISOString() }),
      })
      await onDone()
    } catch (submitError) {
      onError(submitError instanceof Error ? submitError.message : 'Could not create workshop')
    }
  }

  return (
    <div className="overlay">
      <form className="card modal" onSubmit={submit}>
        <div className="modal-heading"><h2>{workshop ? 'Edit workshop' : 'Add workshop'}</h2><button type="button" className="icon-button" onClick={onClose}>×</button></div>
        <div className="form-grid">
          <label>Code<input value={form.code} onChange={(event) => update('code', event.target.value)} required /></label>
          <label>Title<input value={form.title} onChange={(event) => update('title', event.target.value)} required /></label>
          <label>Instructor<input value={form.instructor} onChange={(event) => update('instructor', event.target.value)} required /></label>
          <label>Location<input value={form.location} onChange={(event) => update('location', event.target.value)} required /></label>
          <label>Date and time<input type="datetime-local" value={form.dateTime} onChange={(event) => update('dateTime', event.target.value)} required /></label>
          <label>Capacity<input type="number" min="1" value={form.capacity} onChange={(event) => update('capacity', event.target.value)} required /></label>
          <label className="wide">Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} /></label>
          <label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option>OPEN</option><option>DRAFT</option></select></label>
        </div>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary">{workshop ? 'Save changes' : 'Create workshop'}</button></div>
      </form>
    </div>
  )
}

function UserForm({
  token,
  onClose,
  onDone,
  onError,
}: {
  token: string
  onClose: () => void
  onDone: () => void
  onError: (message: string) => void
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MANAGER' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await request('/users', token, { method: 'POST', body: JSON.stringify(form) })
      onDone()
    } catch (submitError) {
      onError(submitError instanceof Error ? submitError.message : 'Could not create user')
    }
  }

  return (
    <div className="overlay">
      <form className="card modal small-modal" onSubmit={submit}>
        <div className="modal-heading"><h2>Create user</h2><button type="button" className="icon-button" onClick={onClose}>×</button></div>
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>Password<input type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
        <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="MANAGER">Manager</option><option value="STAFF">Staff</option></select></label>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary">Create user</button></div>
      </form>
    </div>
  )
}

export default App
