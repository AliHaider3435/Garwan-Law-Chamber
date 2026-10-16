'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { UserRole } from '@/lib/types';

export default function UsersPage() {
  const { currentUser, users, assoc, addUser, deleteUser, updateUser, addAssociate, toast } = useStore();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('associate');
  const [assocId, setAssocId] = useState('');
  const [autoCreateAssoc, setAutoCreateAssoc] = useState(false);
  const [busy, setBusy] = useState(false);

  // Edit modal / inline edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPass, setEditPass] = useState('');

  if (currentUser && currentUser.role !== 'superadmin') {
    return (
      <div className="pn pp">
        <h2>Access restricted</h2>
        <p className="mut">Only the Chamber Super Admin can access the user credentials directory.</p>
        <button className="pri" onClick={() => router.push('/dashboard')}>Return to Dashboard</button>
      </div>
    );
  }

  async function handleAddUser(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !name.trim()) {
      toast('Please fill in username, name, and password.');
      return;
    }
    if (password.trim().length < 8 || password.length > 256) {
      toast('Passwords must be 8-256 characters long.');
      return;
    }

    setBusy(true);
    try {
      let linkedAssocId = assocId;

      if (role === 'associate') {
        if (autoCreateAssoc || !linkedAssocId) {
          const created = await addAssociate(name.trim(), '');
          if (!created) return;
          linkedAssocId = created.id;
        }
      }

      const err = await addUser({
        username: username.trim(),
        email: email.trim() || `${username.trim()}@garwanlaw.com`,
        password,
        name: name.trim(),
        role,
        associateId: role === 'associate' ? linkedAssocId || undefined : undefined,
      });

      if (!err) {
        setUsername('');
        setName('');
        setEmail('');
        setPassword('');
        setAssocId('');
        setAutoCreateAssoc(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function savePasswordEdit(userId: string) {
    const userToEdit = users.find((u) => u.id === userId);
    if (!userToEdit || !editPass.trim()) return;
    if (editPass.trim().length < 8 || editPass.length > 256) {
      toast('Passwords must be 8-256 characters long.');
      return;
    }
    const error = await updateUser({ ...userToEdit, password: editPass });
    if (error) return;
    setEditingUserId(null);
    setEditPass('');
  }

  return (
    <>
      {/* Overview Notice */}
      <div className="note" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span>
          <b>Super Admin Access:</b> Manage chamber accounts, assign cases to associates, and reset passwords. Existing passwords are never displayed.
        </span>
      </div>

      {/* Provision new User Form */}
      <form className="pn pp" onSubmit={handleAddUser}>
        <h2>Add chamber user / associate login</h2>
        <p className="mut" style={{ marginTop: 4, marginBottom: 16 }}>
          Create credentials for an associate advocate or super admin. Associates will only be able to view cases assigned to them.
        </p>

        <div className="g2">
          <label>
            Full Name
            <input
              type="text"
              required
              placeholder="Adv. Kamran Bashir"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Username
            <input
              type="text"
              required
              placeholder="kamran"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
            />
          </label>
        </div>

        <div className="g2">
          <label>
            Email address
            <input
              type="email"
              placeholder="kamran@garwanlaw.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Initial password
            <input
              type="password"
              required
              minLength={8}
              maxLength={256}
              autoComplete="new-password"
              placeholder="8-256 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        <div className="g2">
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="associate">Associate Advocate (Restricted to assigned cases)</option>
              <option value="superadmin">Super Admin (Full access to all chamber cases & users)</option>
            </select>
          </label>

          {role === 'associate' ? (
            <label>
              Link to Chamber Associate Profile
              <select value={assocId} onChange={(e) => setAssocId(e.target.value)}>
                <option value="">-- Select Associate or create new --</option>
                {assoc.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.phone ? `(${a.phone})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Permissions
              <input type="text" readOnly disabled value="All Chamber Cases & Chamber Management" />
            </label>
          )}
        </div>

        {role === 'associate' && !assocId && (
          <label className="ck" style={{ margin: '8px 0 16px' }}>
            <input
              type="checkbox"
              checked={autoCreateAssoc}
              onChange={(e) => setAutoCreateAssoc(e.target.checked)}
            />
            Automatically create an advocate profile named &quot;{name || 'this user'}&quot; in the Chamber Associates list
          </label>
        )}

        <div style={{ marginTop: 12 }}>
          <button className="pri" disabled={busy}>
            {busy ? 'Creating user...' : 'Create user login'}
          </button>
        </div>
      </form>

      {/* User Directory */}
      <div className="pn">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 6px' }}>
          <h2>Chamber users & credentials ({users.length})</h2>
          <span className="sm mut">Passwords are hashed and never displayed</span>
        </div>

        <div className="tbl-wrap">
        <table className="tb">
          <thead>
            <tr>
              <th>User</th>
              <th className="hm">Role</th>
              <th>Assigned Advocate</th>
              <th>Password reset</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const linkedAssoc = u.associateId ? assoc.find((a) => a.id === u.associateId) : null;
              const isSuper = u.role === 'superadmin';
              const isSelf = currentUser?.id === u.id;
              const isEditing = editingUserId === u.id;

              return (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                    <small>
                      Username: <code style={{ color: 'var(--burt)', fontWeight: 600 }}>@{u.username}</code>
                      {u.email && ` | ${u.email}`}
                    </small>
                  </td>
                  <td className="hm">
                    <span className={isSuper ? 'tag dec' : 'tag'}>
                      {isSuper ? 'Super Admin' : 'Associate'}
                    </span>
                  </td>
                  <td>
                    {isSuper ? (
                      <span style={{ color: 'var(--mut)', fontStyle: 'italic' }}>All Chamber Cases</span>
                    ) : linkedAssoc ? (
                      <div>
                        <b>{linkedAssoc.name}</b>
                        <small>{linkedAssoc.phone || 'No phone'}</small>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--dng)' }}>Unlinked (cannot see cases)</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={256}
                          placeholder="New password"
                          value={editPass}
                          onChange={(e) => setEditPass(e.target.value)}
                          style={{ padding: '4px 8px', width: 150, margin: 0 }}
                        />
                        <button className="pri sm" type="button" disabled={editPass.trim().length < 8 || editPass.length > 256} onClick={() => savePasswordEdit(u.id)}>Save</button>
                        <button className="ghost sm" type="button" onClick={() => setEditingUserId(null)}>X</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="sm mut">Not shown</span>
                        <button
                          type="button"
                          className="lnk sm"
                          style={{ fontSize: 12 }}
                          onClick={() => {
                            setEditingUserId(u.id);
                            setEditPass('');
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isSelf ? (
                      <span className="sm mut">(You)</span>
                    ) : isSuper && u.username === 'superadmin' ? (
                      <span className="sm mut">Primary Admin</span>
                    ) : (
                      <button
                        type="button"
                        className="dng sm"
                        style={{ padding: '4px 10px' }}
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete user @${u.username}?`)) {
                            deleteUser(u.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
