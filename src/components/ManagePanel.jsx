import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '@/app/components/Button'
import IconProvider from '@/app/components/IconProvider'
import Input from '@/app/components/Input'
import Select from '@/app/components/Select'
import { api } from '../api'
import {
  resolveSubjectAbbreviations,
  resolveTeacherAbbreviations,
} from '../data/abbreviations'
import { Link } from '../router'
import { ConfirmDialog } from './ConfirmDialog'
import { DataTable } from './DataTable'

const TIMINGS = [
  { value: 'pre-lunch', label: 'Before lunch' },
  { value: 'end-of-day', label: 'End of day (extra)' },
]

/**
 * charismap's Select keeps any typed text as the value on blur. For ids that
 * must exist, ignore anything that isn't an option (or a clear) and remount so
 * the field shows the real selection again.
 */
function Pick({ options, onChange, ...props }) {
  const [nonce, setNonce] = useState(0)
  return (
    <Select
      key={nonce}
      {...props}
      options={options}
      onChange={(value) => {
        if (value === '' || options.some((o) => o.value === value)) onChange(value)
        else setNonce((n) => n + 1)
      }}
    />
  )
}

const TABS = [
  ['teachers', 'Teachers'],
  ['classes', 'Classes'],
  ['subjects', 'Subjects'],
  ['links', 'Links'],
]

export function ManagePanel({ user, tab, onChanged }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [toasts, setToasts] = useState([])
  const [confirmRequest, setConfirmRequest] = useState(null)
  const readOnly = !user.admin

  const notify = useCallback((kind, text) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list, { id, kind, text }])
    window.setTimeout(
      () => setToasts((list) => list.filter((t) => t.id !== id)),
      kind === 'error' ? 6000 : 3500,
    )
  }, [])

  const reload = useCallback(async () => {
    const [t, c, l, s] = await Promise.all([
      api('/api/teachers'),
      api('/api/classes'),
      api('/api/links'),
      api('/api/subjects'),
    ])
    setData({ teachers: t.teachers, classes: c.classes, links: l.links, subjects: s.subjects })
  }, [])

  useEffect(() => {
    reload().catch((err) => setError(err.message))
  }, [reload])

  /** Run a write, announce it, then refresh these lists and the timetable. */
  const mutate = useCallback(
    async (path, method, body, done) => {
      try {
        await api(path, { method, body })
      } catch (err) {
        notify('error', err.message)
        return false
      }
      notify('success', done)
      await reload().catch((err) => notify('error', err.message))
      onChanged()
      return true
    },
    [reload, onChanged, notify],
  )

  return (
    <div className="manage">
      <div className="manage-head">
        <nav className="manage-tabs" aria-label="Manage">
          {TABS.map(([id, label]) => (
            <Link
              key={id}
              to={`/manage/${id}`}
              aria-current={tab === id ? 'page' : undefined}
              className={tab === id ? 'manage-tab is-on' : 'manage-tab'}
            >
              {label}
              {data ? (
                <span className="manage-count">{data[id].length}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        {readOnly ? (
          <span className="manage-note">
            View only — ask an admin to make changes
          </span>
        ) : null}
      </div>
      {error ? (
        <div className="form-error manage-error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast is-${t.kind}`}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            <span>{t.text}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {!data ? (
        <p className="manage-empty">Loading…</p>
      ) : tab === 'teachers' ? (
        <TeachersTab data={data} readOnly={readOnly} mutate={mutate} confirm={setConfirmRequest} />
      ) : tab === 'classes' ? (
        <ClassesTab data={data} readOnly={readOnly} mutate={mutate} confirm={setConfirmRequest} />
      ) : tab === 'subjects' ? (
        <SubjectsTab data={data} readOnly={readOnly} mutate={mutate} />
      ) : (
        <LinksTab data={data} readOnly={readOnly} mutate={mutate} confirm={setConfirmRequest} />
      )}
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  )
}

/** Upper-cases each word's first letter, leaving the rest as typed ("mcDonald" → "McDonald"). */
function capitalizeWords(text) {
  return text.replace(/(^|\s)(\p{Ll})/gu, (_, space, letter) => space + letter.toUpperCase())
}

function periodsFor(link) {
  return link.singles + link.doubles * 2
}

function TeachersTab({ data, readOnly, mutate, confirm }) {
  const blank = { name: '', email: '', abbr: '' }
  const [form, setForm] = useState(blank)
  const abbreviations = useMemo(
    () => resolveTeacherAbbreviations(data.teachers),
    [data.teachers],
  )
  const autoAbbr = useMemo(() => {
    if (!form.name.trim()) return ''
    const others = data.teachers.filter((t) => t.id !== form.id)
    return resolveTeacherAbbreviations([...others, { name: form.name.trim() }]).get(
      form.name.trim(),
    )
  }, [data.teachers, form.id, form.name])

  const load = useMemo(() => {
    const map = new Map()
    for (const link of data.links) {
      for (const id of new Set(link.members.map((m) => m.teacherId))) {
        const entry = map.get(id) ?? { links: 0, periods: 0 }
        entry.links += 1
        entry.periods += periodsFor(link)
        map.set(id, entry)
      }
    }
    return map
  }, [data.links])

  const rows = useMemo(
    () =>
      data.teachers.map((t) => ({
        ...t,
        email: t.email ?? '',
        abbr: t.abbr ?? '',
        shortName: abbreviations.get(t.name) ?? '',
        links: load.get(t.id)?.links ?? 0,
        periods: load.get(t.id)?.periods ?? 0,
      })),
    [data.teachers, load, abbreviations],
  )

  async function submit(event) {
    event.preventDefault()
    const ok = form.id
      ? await mutate(
          `/api/teachers?id=${form.id}`,
          'PATCH',
          form,
          `Updated teacher ${form.name.trim()}`,
        )
      : await mutate('/api/teachers', 'POST', form, `Added teacher ${form.name.trim()}`)
    if (ok) setForm(blank)
  }

  const columns = [
    { field: 'name', header: 'Name', width: 220 },
    {
      field: 'shortName',
      header: 'Abbr.',
      width: 90,
      renderFunction: (value, _index, row) => <AbbrCell value={value} auto={!row.abbr} />,
    },
    { field: 'email', header: 'Email', width: 220 },
    { field: 'links', header: 'Links', width: 90 },
    { field: 'periods', header: 'Periods / week', width: 140 },
    ...(readOnly
      ? []
      : [
          {
            field: 'actions',
            header: 'Actions',
            width: 110,
            hideInExcel: true,
            renderFunction: (_value, _index, row) => (
              <RowActions
                onEdit={() =>
                  setForm({ id: row.id, name: row.name, email: row.email, abbr: row.abbr })
                }
                onDelete={() =>
                  confirm(
                    row.links
                      ? {
                          title: `Can't delete ${row.name} yet`,
                          message: `${row.name} still teaches in ${row.links} link${
                            row.links === 1 ? '' : 's'
                          }. Remove or reassign those under Links first.`,
                        }
                      : {
                          title: `Delete ${row.name}?`,
                          message: 'This teacher will be removed for good.',
                          confirmLabel: 'Delete teacher',
                          onConfirm: () =>
                            mutate(
                              `/api/teachers?id=${row.id}`,
                              'DELETE',
                              undefined,
                              `Deleted teacher ${row.name}`,
                            ),
                        },
                  )
                }
              />
            ),
          },
        ]),
  ]

  return (
    <section className="manage-section is-table">
      {readOnly ? null : (
        <form className={`manage-add${form.id ? ' is-editing' : ''}`} onSubmit={submit}>
          {form.id ? <strong className="manage-editing-label">Editing</strong> : null}
          <Input
            required
            label="Teacher name"
            autoCapitalize="words"
            value={form.name}
            onChange={(e) => {
              const field = e.target
              const caret = field.selectionStart
              setForm({ ...form, name: capitalizeWords(field.value) })
              // A changed controlled value moves the caret to the end; put it back
              requestAnimationFrame(() => field.setSelectionRange?.(caret, caret))
            }}
          />
          <Input
            type="email"
            label="Email"
            placeholder="Optional"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            className="manage-abbr"
            voiceInput={false}
            label="Abbreviation"
            placeholder={autoAbbr ? `Auto: ${autoAbbr}` : 'Auto'}
            maxLength={8}
            value={form.abbr}
            onChange={(e) => setForm({ ...form, abbr: e.target.value.toUpperCase() })}
          />
          <Button type="submit" disabled={!form.name.trim()}>
            {form.id ? 'Save changes' : 'Add teacher'}
          </Button>
          {form.id ? (
            <Button variant="secondary" onClick={() => setForm(blank)}>
              Cancel
            </Button>
          ) : null}
        </form>
      )}
      <DataTable
        name="manage-teachers"
        tableTitle="RBS Teachers"
        columns={columns}
        data={rows}
        searchableFields={['name', 'email']}
        noDataMessage="No teachers yet."
      />
    </section>
  )
}

function ClassesTab({ data, readOnly, mutate, confirm }) {
  const blank = { name: '', dayEnd: '', classTeacherId: '', coClassTeacherId: '' }
  const [form, setForm] = useState(blank)
  const teacherName = useMemo(
    () => new Map(data.teachers.map((t) => [t.id, t.name])),
    [data.teachers],
  )
  const teacherOptions = useMemo(
    () => data.teachers.map((t) => ({ value: t.id, label: t.name })),
    [data.teachers],
  )

  const load = useMemo(() => {
    const map = new Map()
    for (const link of data.links) {
      for (const id of new Set(link.members.map((m) => m.classId))) {
        const entry = map.get(id) ?? { links: 0, periods: 0 }
        entry.links += 1
        entry.periods += periodsFor(link)
        map.set(id, entry)
      }
    }
    return map
  }, [data.links])

  const rows = useMemo(
    () =>
      data.classes.map((c) => ({
        ...c,
        classTeacher: [c.classTeacherId, c.coClassTeacherId]
          .map((id) => teacherName.get(id))
          .filter(Boolean)
          .join(' & '),
        dayEnd: c.dayEnd ?? '',
        links: load.get(c.id)?.links ?? 0,
        periods: load.get(c.id)?.periods ?? 0,
      })),
    [data.classes, teacherName, load],
  )

  async function submit(event) {
    event.preventDefault()
    const ok = form.id
      ? await mutate(
          `/api/classes?id=${form.id}`,
          'PATCH',
          form,
          `Updated class ${form.name.trim()}`,
        )
      : await mutate('/api/classes', 'POST', form, `Added class ${form.name.trim()}`)
    if (ok) setForm(blank)
  }

  const columns = [
    { field: 'name', header: 'Class', width: 120 },
    { field: 'classTeacher', header: 'Class teacher', width: 300 },
    { field: 'dayEnd', header: 'Ends early', width: 120 },
    { field: 'periods', header: 'Periods / week', width: 140 },
    ...(readOnly
      ? []
      : [
          {
            field: 'actions',
            header: 'Actions',
            width: 110,
            hideInExcel: true,
            renderFunction: (_value, _index, row) => (
              <RowActions
                onEdit={() =>
                  setForm({
                    id: row.id,
                    name: row.name,
                    dayEnd: row.dayEnd,
                    classTeacherId: row.classTeacherId ?? '',
                    coClassTeacherId: row.coClassTeacherId ?? '',
                  })
                }
                onDelete={() =>
                  confirm(
                    row.links
                      ? {
                          title: `Can't delete class ${row.name} yet`,
                          message: `Class ${row.name} is still in ${row.links} link${
                            row.links === 1 ? '' : 's'
                          }. Remove those under Links first.`,
                        }
                      : {
                          title: `Delete class ${row.name}?`,
                          message: 'This class will be removed for good.',
                          confirmLabel: 'Delete class',
                          onConfirm: () =>
                            mutate(
                              `/api/classes?id=${row.id}`,
                              'DELETE',
                              undefined,
                              `Deleted class ${row.name}`,
                            ),
                        },
                  )
                }
              />
            ),
          },
        ]),
  ]

  return (
    <section className="manage-section is-table">
      {readOnly ? null : (
        <form className={`manage-add${form.id ? ' is-editing' : ''}`} onSubmit={submit}>
          {form.id ? <strong className="manage-editing-label">Editing</strong> : null}
          <Input
            required
            label="Class name"
            placeholder="e.g. 9C"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Pick
            label="Class teacher"
            placeholder="None"
            value={form.classTeacherId}
            options={teacherOptions}
            onChange={(classTeacherId) => setForm({ ...form, classTeacherId })}
          />
          <Pick
            label="Second class teacher"
            placeholder="None"
            value={form.coClassTeacherId}
            options={teacherOptions.filter((o) => o.value !== form.classTeacherId)}
            onChange={(coClassTeacherId) => setForm({ ...form, coClassTeacherId })}
          />
          <Input
            type="time"
            label="Ends early at"
            value={form.dayEnd}
            onChange={(e) => setForm({ ...form, dayEnd: e.target.value })}
          />
          <Button type="submit" disabled={!form.name.trim()}>
            {form.id ? 'Save changes' : 'Add class'}
          </Button>
          {form.id ? (
            <Button variant="secondary" onClick={() => setForm(blank)}>
              Cancel
            </Button>
          ) : null}
        </form>
      )}
      <DataTable
        name="manage-classes"
        tableTitle="RBS Classes"
        columns={columns}
        data={rows}
        searchableFields={['name', 'classTeacher']}
        noDataMessage="No classes yet."
      />
    </section>
  )
}

/**
 * Subjects come from the links that use them, so there's nothing to add or
 * delete here — only the abbreviation printed in compact timetable cells.
 */
function SubjectsTab({ data, readOnly, mutate }) {
  const [form, setForm] = useState(null)
  const abbreviations = useMemo(
    () =>
      resolveSubjectAbbreviations(
        data.subjects.map((s) => s.name),
        Object.fromEntries(data.subjects.filter((s) => s.abbr).map((s) => [s.name, s.abbr])),
      ),
    [data.subjects],
  )
  const rows = useMemo(
    () =>
      data.subjects.map((s) => ({
        ...s,
        abbr: s.abbr ?? '',
        shortName: abbreviations.get(s.name) ?? '',
      })),
    [data.subjects, abbreviations],
  )
  const autoAbbr = useMemo(() => {
    if (!form) return ''
    const others = data.subjects.filter((s) => s.id !== form.id && s.abbr)
    return resolveSubjectAbbreviations(
      data.subjects.map((s) => s.name),
      Object.fromEntries(others.map((s) => [s.name, s.abbr])),
    ).get(form.name)
  }, [data.subjects, form])

  async function submit(event) {
    event.preventDefault()
    const abbr = form.abbr.trim()
    const ok = await mutate(
      '/api/subjects',
      'PUT',
      { name: form.name, abbr },
      abbr
        ? `${form.name} is now ${abbr}`
        : `${form.name} is back to its automatic abbreviation`,
    )
    if (ok) setForm(null)
  }

  const columns = [
    { field: 'name', header: 'Subject', width: 240 },
    {
      field: 'shortName',
      header: 'Abbr.',
      width: 110,
      renderFunction: (value, _index, row) => <AbbrCell value={value} auto={!row.abbr} />,
    },
    { field: 'links', header: 'Links', width: 90 },
    ...(readOnly
      ? []
      : [
          {
            field: 'actions',
            header: 'Actions',
            width: 90,
            hideInExcel: true,
            renderFunction: (_value, _index, row) => (
              <div className="row-actions">
                <button
                  type="button"
                  className="icon-action"
                  onClick={() => setForm({ id: row.id, name: row.name, abbr: row.abbr })}
                  aria-label={`Edit abbreviation for ${row.name}`}
                  title="Edit abbreviation"
                >
                  <IconProvider name="edit" size={22} color={EDIT_COLOR} />
                </button>
              </div>
            ),
          },
        ]),
  ]

  return (
    <section className="manage-section is-table">
      {readOnly ? null : form ? (
        <form className="manage-add is-editing" onSubmit={submit}>
          <strong className="manage-editing-label">Editing</strong>
          <Input label="Subject" value={form.name} readOnly voiceInput={false} />
          <Input
            className="manage-abbr"
            voiceInput={false}
            label="Abbreviation"
            placeholder={autoAbbr ? `Auto: ${autoAbbr}` : 'Auto'}
            maxLength={12}
            value={form.abbr}
            onChange={(e) => setForm({ ...form, abbr: e.target.value.toUpperCase() })}
          />
          <Button type="submit">Save changes</Button>
          <Button variant="secondary" onClick={() => setForm(null)}>
            Cancel
          </Button>
        </form>
      ) : (
        <p className="muted manage-hint">
          Abbreviations shorten busy cells in the PDF, with a key under each page.
          Leave one blank to use the automatic version.
        </p>
      )}
      <DataTable
        name="manage-subjects"
        tableTitle="RBS Subjects"
        columns={columns}
        data={rows}
        searchableFields={['name', 'shortName']}
        noDataMessage="Subjects appear here once a link uses them."
      />
    </section>
  )
}

function AbbrCell({ value, auto }) {
  return (
    <span className={auto ? 'abbr-cell is-auto' : 'abbr-cell'} title={auto ? 'Automatic' : 'Set by hand'}>
      {value}
    </span>
  )
}

const EDIT_COLOR = '#64B5F6'
const DELETE_COLOR = '#EF5350'

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="row-actions">
      <button type="button" className="icon-action" onClick={onEdit} aria-label="Edit" title="Edit">
        <IconProvider name="edit" size={22} color={EDIT_COLOR} />
      </button>
      <button
        type="button"
        className="icon-action is-delete"
        onClick={onDelete}
        aria-label="Delete"
        title="Delete"
      >
        <IconProvider name="delete" size={22} color={DELETE_COLOR} />
      </button>
    </div>
  )
}

function LinksTab({ data, readOnly, mutate, confirm }) {
  const [classFilter, setClassFilter] = useState(data.classes[0]?.id ?? '')
  const [editing, setEditing] = useState(null)
  const className = useMemo(
    () => new Map(data.classes.map((c) => [c.id, c.name])),
    [data.classes],
  )
  const teacherName = useMemo(
    () => new Map(data.teachers.map((t) => [t.id, t.name])),
    [data.teachers],
  )
  const classOptions = useMemo(
    () => data.classes.map((c) => ({ value: c.id, label: c.name })),
    [data.classes],
  )
  /** e.g. "12 · Painting (Shahnaz Ali) +1 more" */
  const describeLink = (link) => {
    const [m, ...rest] = link.members
    const who = teacherName.get(m.teacherId)
    return `${className.get(m.classId) ?? '?'} · ${m.subject}${who ? ` (${who})` : ''}${
      rest.length ? ` +${rest.length} more` : ''
    }`
  }
  const shown = data.links.filter(
    (link) => !classFilter || link.members.some((m) => m.classId === classFilter),
  )
  const total = shown.reduce((sum, link) => sum + periodsFor(link), 0)

  async function save(link) {
    const label = describeLink(link)
    const ok = link.id
      ? await mutate(`/api/links?id=${link.id}`, 'PATCH', link, `Updated link ${label}`)
      : await mutate('/api/links', 'POST', link, `Added link ${label}`)
    if (ok) setEditing(null)
  }

  return (
    <section className="manage-section">
      <div className="manage-add">
        <Pick
          className="manage-filter"
          label="Class"
          placeholder="All classes"
          value={classFilter}
          options={classOptions}
          onChange={(value) => {
            setClassFilter(value)
            setEditing(null)
          }}
        />
        <span className="muted">
          {shown.length} links · {total} periods / week
        </span>
        {readOnly ? null : (
          <Button
            disabled={!data.classes.length || !data.teachers.length}
            onClick={() =>
              setEditing({
                members: [
                  {
                    classId: classFilter || data.classes[0].id,
                    subject: '',
                    teacherId: '',
                    timing: '',
                    stream: '',
                  },
                ],
                singles: 1,
                doubles: 0,
              })
            }
          >
            New link
          </Button>
        )}
      </div>
      {editing && !editing.id ? (
        <LinkEditor
          initial={editing}
          data={data}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : null}
      <ul className="link-list">
        {shown.map((link) =>
          editing?.id === link.id ? (
            <li key={link.id}>
              <LinkEditor
                initial={editing}
                data={data}
                onSave={save}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={link.id} className="link-card">
              <div className="link-main">
                {link.members.map((m, i) => (
                  <div key={i} className="link-member">
                    <span className="link-class">{className.get(m.classId) ?? '?'}</span>
                    <strong>{m.subject}</strong>
                    <span>{teacherName.get(m.teacherId) ?? 'Unknown teacher'}</span>
                    {m.timing ? (
                      <span className="link-tag">
                        {TIMINGS.find((t) => t.value === m.timing)?.label}
                      </span>
                    ) : null}
                    {m.stream ? <span className="link-tag is-soft">{m.stream}</span> : null}
                  </div>
                ))}
              </div>
              <div className="link-counts">
                {link.singles ? <span>{link.singles}× single</span> : null}
                {link.doubles ? <span>{link.doubles}× double</span> : null}
                <span className="muted">{periodsFor(link)} periods</span>
              </div>
              {readOnly ? null : (
                <RowActions
                  onEdit={() =>
                    setEditing({
                      ...link,
                      members: link.members.map((m) => ({
                        ...m,
                        timing: m.timing ?? '',
                        stream: m.stream ?? '',
                      })),
                    })
                  }
                  onDelete={() =>
                    confirm({
                      title: 'Delete this link?',
                      message: `${describeLink(link)} · ${periodsFor(link)} periods a week will come off the timetable.`,
                      confirmLabel: 'Delete link',
                      onConfirm: () =>
                        mutate(
                          `/api/links?id=${link.id}`,
                          'DELETE',
                          undefined,
                          `Deleted link ${describeLink(link)}`,
                        ),
                    })
                  }
                />
              )}
            </li>
          ),
        )}
        {shown.length === 0 ? <li className="manage-empty">No links yet.</li> : null}
      </ul>
    </section>
  )
}

function LinkEditor({ initial, data, onSave, onCancel }) {
  const [link, setLink] = useState(initial)
  const [busy, setBusy] = useState(false)
  const options = useMemo(
    () => ({
      classes: data.classes.map((c) => ({ value: c.id, label: c.name })),
      teachers: data.teachers.map((t) => ({ value: t.id, label: t.name })),
      subjects: [...new Set(data.links.flatMap((l) => l.members.map((m) => m.subject)))]
        .sort()
        .map((s) => ({ value: s, label: s })),
    }),
    [data],
  )
  const complete = link.members.every((m) => m.classId && m.subject.trim() && m.teacherId)

  const setMember = (index, patch) =>
    setLink((current) => ({
      ...current,
      members: current.members.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    await onSave(link)
    setBusy(false)
  }

  return (
    <form className="link-editor" onSubmit={submit}>
      <p className="muted">
        One row per class, subject and teacher. Several rows are taught at the
        same time — parallel electives, or a joint class.
      </p>
      {link.members.map((m, i) => (
        <div key={i} className="link-row">
          <Pick
            required
            clearable={false}
            label="Class"
            value={m.classId}
            options={options.classes}
            onChange={(classId) => setMember(i, { classId })}
          />
          <Select
            required
            label="Subject"
            placeholder="Pick or type"
            value={m.subject}
            options={options.subjects}
            onChange={(subject) => setMember(i, { subject })}
          />
          <Pick
            required
            label="Teacher"
            placeholder="Choose…"
            value={m.teacherId}
            options={options.teachers}
            onChange={(teacherId) => setMember(i, { teacherId })}
          />
          <Pick
            label="Timing"
            placeholder="Any time"
            value={m.timing}
            options={TIMINGS}
            onChange={(timing) => setMember(i, { timing })}
          />
          <Input
            label="Stream"
            placeholder="Optional"
            value={m.stream}
            onChange={(e) => setMember(i, { stream: e.target.value })}
          />
          <Button
            variant="secondary"
            size="small"
            disabled={link.members.length === 1}
            onClick={() =>
              setLink({ ...link, members: link.members.filter((_, j) => j !== i) })
            }
            aria-label="Remove row"
          >
            Remove
          </Button>
        </div>
      ))}
      <div className="link-editor-foot">
        <Button
          variant="secondary"
          onClick={() =>
            setLink({
              ...link,
              members: [
                ...link.members,
                { ...link.members[link.members.length - 1], subject: '', teacherId: '' },
              ],
            })
          }
        >
          + Add row
        </Button>
        <Input
          type="number"
          label="Singles"
          min={0}
          max={20}
          value={link.singles}
          onChange={(e) => setLink({ ...link, singles: Number(e.target.value) })}
        />
        <Input
          type="number"
          label="Doubles"
          min={0}
          max={20}
          value={link.doubles}
          onChange={(e) => setLink({ ...link, doubles: Number(e.target.value) })}
        />
        <span className="muted">
          = {link.singles + link.doubles * 2} periods / week
        </span>
        <span className="spacer" />
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} disabled={!complete}>
          {busy ? 'Saving…' : 'Save link'}
        </Button>
      </div>
    </form>
  )
}
