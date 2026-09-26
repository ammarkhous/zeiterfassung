'use client';

import { FormEvent, useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useSessionTypes } from '@/hooks/useSessionTypes';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PeopleIcon, TagIcon, PencilIcon, PowerIcon, TrashIcon } from '@/components/nav/icons';

export default function SettingsPage() {
  const { customers, addCustomer, updateCustomer, toggleActive, deleteCustomer } = useCustomers();
  const { sessionTypes, addSessionType, updateSessionType, deleteSessionType } = useSessionTypes();
  const { showToast } = useToast();

  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');

  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');

  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeLabel, setEditTypeLabel] = useState('');

  const handleAddCustomer = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName || !newRate) return;
    await addCustomer(newName, parseFloat(newRate.replace(',', '.')));
    setNewName('');
    setNewRate('');
    showToast('Kunde hinzugefügt', 'success');
  };

  const startEditCustomer = (id: string, name: string, rate: number) => {
    setEditingCustomerId(id);
    setEditName(name);
    setEditRate(rate.toString());
  };

  const saveEditCustomer = async () => {
    if (!editingCustomerId) return;
    await updateCustomer(editingCustomerId, {
      name: editName,
      ae_rate: parseFloat(editRate.replace(',', '.')),
    });
    setEditingCustomerId(null);
    showToast('Kunde aktualisiert', 'success');
  };

  const handleDeleteCustomer = async (id: string) => {
    const result = await deleteCustomer(id);
    if (!result.success) {
      showToast(result.error ?? 'Fehler', 'error');
    } else {
      showToast('Kunde gelöscht', 'success');
    }
  };

  const handleAddType = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTypeLabel) return;
    await addSessionType(newTypeLabel);
    setNewTypeLabel('');
    showToast('Typ hinzugefügt', 'success');
  };

  const startEditType = (id: string, label: string) => {
    setEditingTypeId(id);
    setEditTypeLabel(label);
  };

  const saveEditType = async () => {
    if (!editingTypeId) return;
    await updateSessionType(editingTypeId, editTypeLabel);
    setEditingTypeId(null);
    showToast('Typ aktualisiert', 'success');
  };

  const handleDeleteType = async (id: string) => {
    const result = await deleteSessionType(id);
    if (!result.success) {
      showToast(result.error ?? 'Fehler', 'error');
    } else {
      showToast('Typ gelöscht', 'success');
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Ihre Einstellungen
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-text">Einstellungen</h1>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Die Menschen, denen Sie helfen
            </p>
            <h2 className="text-xl font-bold text-text">Kunden</h2>
          </div>
        </div>

        <form
          onSubmit={handleAddCustomer}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-surface p-4"
        >
          <Input
            label="Name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            label="AE-Satz (€/AE) *"
            type="number"
            step="0.01"
            min="0"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            required
          />
          <Button type="submit">+ Kunde hinzufügen</Button>
        </form>

        {customers.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon className="h-5 w-5" />}
            title="Ihre Kunden gehören hierhin"
            description="Fügen Sie einen Namen und einen optionalen AE-Satz hinzu."
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            {customers.map((c) =>
              editingCustomerId === c.id ? (
                <div
                  key={c.id}
                  className="flex flex-wrap items-end gap-3 border-b border-border bg-surface-2 px-4 py-3 last:border-b-0"
                >
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Input
                    type="number"
                    step="0.01"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                  />
                  <Button size="sm" onClick={saveEditCustomer}>
                    Speichern
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingCustomerId(null)}>
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 last:border-b-0 hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text" title={c.name}>
                        {c.name}
                      </p>
                      <Badge variant={c.active ? 'success' : 'default'}>
                        {c.active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted">
                      {c.ae_rate.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/AE
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <IconButton
                      label="Bearbeiten"
                      onClick={() => startEditCustomer(c.id, c.name, c.ae_rate)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={c.active ? 'Deaktivieren' : 'Aktivieren'}
                      onClick={() => toggleActive(c.id)}
                    >
                      <PowerIcon className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="Löschen"
                      variant="danger"
                      onClick={() => handleDeleteCustomer(c.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Ihre Kategorien
          </p>
          <h2 className="text-xl font-bold text-text">Session-Typen</h2>
        </div>

        <form
          onSubmit={handleAddType}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-surface p-4"
        >
          <Input
            label="Bezeichnung *"
            value={newTypeLabel}
            onChange={(e) => setNewTypeLabel(e.target.value)}
            required
          />
          <Button type="submit">+ Typ hinzufügen</Button>
        </form>

        {sessionTypes.length === 0 ? (
          <EmptyState
            icon={<TagIcon className="h-5 w-5" />}
            title="Noch keine Typen"
            description="Legen Sie Kategorien wie Beratung oder Entwicklung an."
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            {sessionTypes.map((s) =>
              editingTypeId === s.id ? (
                <div
                  key={s.id}
                  className="flex flex-wrap items-end gap-3 border-b border-border bg-surface-2 px-4 py-3 last:border-b-0"
                >
                  <Input value={editTypeLabel} onChange={(e) => setEditTypeLabel(e.target.value)} />
                  <Button size="sm" onClick={saveEditType}>
                    Speichern
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingTypeId(null)}>
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 last:border-b-0 hover:bg-surface-2"
                >
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-text" title={s.label}>
                    {s.label}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <IconButton label="Bearbeiten" onClick={() => startEditType(s.id, s.label)}>
                      <PencilIcon className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Löschen" variant="danger" onClick={() => handleDeleteType(s.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
