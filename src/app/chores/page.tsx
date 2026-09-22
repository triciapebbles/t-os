"use client";

import { useEffect, useMemo, useState } from "react";

type Person = { id: string; name: string; color: string | null };
type Category = { id: string; name: string; color: string | null };
type Chore = {
  id: string;
  name: string;
  description: string | null;
  category: Category | null;
  frequency: string | null;
  bestDoneOn: string | null;
  remarks: string | null;
  durationMinutes: number | null;
  assignees: { person: Person }[];
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  newCategoryName: string;
  frequency: string;
  bestDoneOn: string;
  remarks: string;
  durationMinutes: string;
  personIds: string[];
};

const emptyForm: FormState = {
  name: "",
  description: "",
  categoryId: "",
  newCategoryName: "",
  frequency: "",
  bestDoneOn: "",
  remarks: "",
  durationMinutes: "",
  personIds: [],
};

function formatDuration(minutes: number | null) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hrs = minutes / 60;
  return `${Number.isInteger(hrs) ? hrs : hrs.toFixed(1)} hr${hrs !== 1 ? "s" : ""}`;
}

// category pill colors — matches the household's original chores board
const CATEGORY_STYLE: Record<string, string> = {
  kitchen: "text-[#8A6D1B] bg-[#FBF0C2]",
  plants: "text-[#3F7A4C] bg-[#DCEEDD]",
  laundry: "text-[#8B6544] bg-[#EFE0D2]",
  cats: "text-[#5B6B2E] bg-[#E4EAC6]",
};
function categoryStyle(name: string) {
  return CATEGORY_STYLE[name.toLowerCase()] ?? "text-brand-500 bg-brand-100";
}

// owner badge colors — named household members get their own color, anyone
// else (or multiple people) falls back to a neutral amber tag
function personStyle(name: string) {
  const n = name.toLowerCase();
  if (n === "tricia") return "text-tricia bg-tricia-soft";
  if (n === "zane") return "text-zane bg-zane-soft";
  return "text-flag bg-flag-soft";
}

export default function ChoresPage() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [newPersonName, setNewPersonName] = useState("");

  async function loadAll() {
    setLoading(true);
    const [choresRes, peopleRes, categoriesRes] = await Promise.all([
      fetch("/api/chores"),
      fetch("/api/people"),
      fetch("/api/categories"),
    ]);
    setChores(await choresRes.json());
    setPeople(await peopleRes.json());
    setCategories(await categoriesRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const grouped = useMemo(() => {
    const filtered =
      categoryFilter === "all" ? chores : chores.filter((c) => c.category?.id === categoryFilter);
    const byCategory = new Map<string, Chore[]>();
    for (const chore of filtered) {
      const key = chore.category?.name ?? "uncategorized";
      byCategory.set(key, [...(byCategory.get(key) ?? []), chore]);
    }
    return byCategory;
  }, [chores, categoryFilter]);

  function openNewForm() {
    setForm({ ...emptyForm });
  }

  function openEditForm(chore: Chore) {
    setForm({
      id: chore.id,
      name: chore.name,
      description: chore.description ?? "",
      categoryId: chore.category?.id ?? "",
      newCategoryName: "",
      frequency: chore.frequency ?? "",
      bestDoneOn: chore.bestDoneOn ?? "",
      remarks: chore.remarks ?? "",
      durationMinutes: chore.durationMinutes ? String(chore.durationMinutes) : "",
      personIds: chore.assignees.map((a) => a.person.id),
    });
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    const payload = {
      name: form.name,
      description: form.description || undefined,
      categoryId: form.categoryId || undefined,
      newCategoryName: form.categoryId ? undefined : form.newCategoryName || undefined,
      frequency: form.frequency || undefined,
      bestDoneOn: form.bestDoneOn || undefined,
      remarks: form.remarks || undefined,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      personIds: form.personIds,
    };

    if (form.id) {
      await fetch(`/api/chores/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setForm(null);
    loadAll();
  }

  async function deleteChore(id: string) {
    if (!confirm("Delete this chore?")) return;
    await fetch(`/api/chores/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function addPerson() {
    if (!newPersonName.trim()) return;
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPersonName.trim() }),
    });
    const person = await res.json();
    setPeople((p) => [...p, person].sort((a, b) => a.name.localeCompare(b.name)));
    setNewPersonName("");
    if (form) {
      setForm({ ...form, personIds: [...form.personIds, person.id] });
    }
  }

  function togglePerson(personId: string) {
    if (!form) return;
    setForm({
      ...form,
      personIds: form.personIds.includes(personId)
        ? form.personIds.filter((id) => id !== personId)
        : [...form.personIds, personId],
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-brand-900">Chores</h1>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-brand-300 px-3 py-1.5 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={openNewForm}
            className="rounded-md bg-brand-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-brand-700"
          >
            + Add chore
          </button>
        </div>
      </div>

      {loading && <p className="mono text-sm text-brand-500">Loading…</p>}

      {!loading &&
        Array.from(grouped.entries()).map(([categoryName, categoryChores]) => (
          <div key={categoryName} className="space-y-3">
            <span className={`mono inline-block text-[11px] tracking-wide uppercase px-2.5 py-1 rounded-md ${categoryStyle(categoryName)}`}>
              {categoryName}
            </span>
            <div className="grid sm:grid-cols-2 gap-3">
              {categoryChores.map((chore) => (
                <div key={chore.id} className="rounded-2xl border border-brand-200 bg-white p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-brand-900">{chore.name}</h3>
                    <div className="flex gap-1.5 shrink-0 mono text-[11px]">
                      <button
                        onClick={() => openEditForm(chore)}
                        className="text-brand-500 hover:text-brand-800"
                      >
                        Edit
                      </button>
                      <span className="text-brand-200">|</span>
                      <button
                        onClick={() => deleteChore(chore.id)}
                        className="text-tricia hover:opacity-80"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {chore.description && <p className="text-sm text-brand-500 -mt-1">{chore.description}</p>}
                  <div className="mono flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-brand-500">
                    {chore.frequency && <span>{chore.frequency}</span>}
                    <span>{formatDuration(chore.durationMinutes)}</span>
                    {chore.bestDoneOn && <span>{chore.bestDoneOn}</span>}
                  </div>
                  {chore.assignees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {chore.assignees.map((a) => (
                        <span
                          key={a.person.id}
                          className={`mono text-[11.5px] tracking-wide uppercase rounded-md px-2.5 py-1 ${personStyle(a.person.name)}`}
                        >
                          {a.person.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {chore.remarks && <p className="text-xs text-brand-400 italic">{chore.remarks}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}

      {!loading && grouped.size === 0 && (
        <p className="text-brand-400 text-sm">No chores yet — add your first one above.</p>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-20">
          <form
            onSubmit={submitForm}
            className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold text-brand-900">{form.id ? "Edit chore" : "New chore"}</h2>

            <div>
              <label className="text-sm font-medium text-brand-700">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-brand-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-brand-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-md border border-brand-300 px-3 py-1.5 text-sm"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-brand-700">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-brand-300 px-3 py-1.5 text-sm"
                >
                  <option value="">— choose or add new below —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {!form.categoryId && (
                  <input
                    placeholder="New category name"
                    value={form.newCategoryName}
                    onChange={(e) => setForm({ ...form, newCategoryName: e.target.value })}
                    className="mt-1 w-full rounded-md border border-brand-300 px-3 py-1.5 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700">Duration (minutes)</label>
                <input
                  type="number"
                  min={0}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                  className="mt-1 w-full rounded-md border border-brand-300 px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-brand-700">Frequency</label>
                <input
                  placeholder="e.g. once a week"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="mt-1 w-full rounded-md border border-brand-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-700">Best done on</label>
                <input
                  placeholder="e.g. sunday"
                  value={form.bestDoneOn}
                  onChange={(e) => setForm({ ...form, bestDoneOn: e.target.value })}
                  className="mt-1 w-full rounded-md border border-brand-300 px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-brand-700">Remarks</label>
              <input
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                className="mt-1 w-full rounded-md border border-brand-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-brand-700">Assigned to</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {people.map((person) => (
                  <button
                    type="button"
                    key={person.id}
                    onClick={() => togglePerson(person.id)}
                    className={`text-xs rounded-full px-3 py-1 border ${
                      form.personIds.includes(person.id)
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-brand-700 border-brand-300"
                    }`}
                  >
                    {person.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  placeholder="Add a new person"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="flex-1 rounded-md border border-brand-300 px-3 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={addPerson}
                  className="text-sm rounded-md border border-brand-300 px-3 py-1 hover:bg-brand-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-md px-4 py-1.5 text-sm border border-brand-300 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-brand-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-brand-700"
              >
                {form.id ? "Save changes" : "Create chore"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
