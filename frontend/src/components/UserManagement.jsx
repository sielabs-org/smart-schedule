import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { api } from '../services/api';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  division: '',
  teacher: ''
};

export default function UserManagement({ disabled = false }) {
  const [users, setUsers] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(!disabled);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (disabled) return undefined;
    let isCurrent = true;

    Promise.all([api.get('/users'), api.get('/divisions'), api.get('/teachers')])
      .then(([userResponse, divisionResponse, teacherResponse]) => {
        if (!isCurrent) return;
        setUsers(userResponse.users || []);
        setDivisions(divisionResponse.divisions || []);
        setTeachers(teacherResponse.teachers || []);
        setError('');
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message || 'Could not load account setup data.');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [disabled]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleRoleChange = (event) => {
    setForm((current) => ({
      ...current,
      role: event.target.value,
      division: '',
      teacher: ''
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === 'student' ? { division: form.division } : { teacher: form.teacher })
      };
      const { user } = await api.post('/users', payload);
      const createdUser = {
        ...user,
        division: divisions.find((item) => item._id === form.division) || null,
        teacher: teachers.find((item) => item._id === form.teacher) || null
      };
      setUsers((current) => [...current, createdUser].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(initialForm);
      setSuccess(`Created ${createdUser.role} account for ${createdUser.email}. Share the temporary password securely.`);
    } catch (requestError) {
      setError(requestError.message || 'Could not create this account.');
    } finally {
      setIsSaving(false);
    }
  };

  if (disabled) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Account creation is disabled in the public demo. Use a real administrator account to manage users.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <UserPlus className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">User accounts</h2>
          <p className="text-xs text-slate-500">Create student and teacher accounts with server-validated assignments.</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading account setup...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form onSubmit={handleCreateUser} className="grid content-start gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Role
              <select
                name="role"
                value={form.role}
                onChange={handleRoleChange}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Full name
              <input
                name="name"
                required
                value={form.name}
                onChange={updateField}
                autoComplete="name"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Email
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={updateField}
                autoComplete="email"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Temporary password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={updateField}
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800"
              />
            </label>
            {form.role === 'student' ? (
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                Assigned division
                <select
                  name="division"
                  required
                  value={form.division}
                  onChange={updateField}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"
                >
                  <option value="">Choose a division</option>
                  {divisions.map((division) => (
                    <option key={division._id} value={division._id}>
                      {division.code} — {division.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                Linked teacher profile
                <select
                  name="teacher"
                  required
                  value={form.teacher}
                  onChange={updateField}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"
                >
                  <option value="">Choose a teacher profile</option>
                  {teachers.filter((teacher) => teacher.isActive && teacher.subjects?.length > 0).map((teacher) => {
                    const divisionsForTeacher = [
                      ...new Set((teacher.subjects || []).map((subject) => subject.division?.code).filter(Boolean))
                    ];
                    const assignment = `${divisionsForTeacher.join(', ')} · ${teacher.subjects.length} subjects`;
                    return (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name} — {assignment}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}
            {form.role === 'teacher' && !teachers.some((teacher) => teacher.isActive && teacher.subjects?.length > 0) && (
              <p className="text-xs text-amber-800 sm:col-span-2">
                Add a teacher profile and assign it subjects/divisions before creating its login account.
              </p>
            )}
            <button
              type="submit"
              disabled={isSaving || (form.role === 'student' ? !divisions.length : !teachers.some((teacher) => teacher.isActive && teacher.subjects?.length > 0))}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create {form.role} account
            </button>
          </form>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Existing accounts ({users.length})
            </h3>
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {users.map((user) => (
                <li key={user.id} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-slate-800">{user.name}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {user.role}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <p className="text-[11px] text-slate-500">
                    {user.role === 'student'
                      ? `Division: ${user.division?.code || 'Not assigned'}`
                      : user.role === 'teacher'
                        ? `Teacher profile: ${user.teacher?.name || 'Not assigned'}`
                        : 'Administrator'}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
