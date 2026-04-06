import { useState, useMemo } from 'react';
import { useCampaigns, useCampaignEntries } from '../hooks/useCampaigns';
import { useEmployees } from '../hooks/useEmployees';
import { useRole } from '../rbac/useRole';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, Trophy, Pencil, Trash2, ToggleLeft, ToggleRight,
  UserPlus, Eye, EyeOff, ChevronRight, ArrowLeft, Sparkles,
  Cake, Award, Star,
} from 'lucide-react';
import type { Campaign, CampaignEntry, CampaignType } from '@rco/shared';
import { MONTHS } from '@rco/shared';

const TYPE_LABELS: Record<CampaignType, string> = {
  rockstar: 'Rockstar',
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  custom: 'Custom',
};

const TYPE_ORDER: CampaignType[] = ['birthday', 'anniversary', 'rockstar', 'custom'];

const TYPE_ICONS: Record<CampaignType, typeof Trophy> = {
  birthday: Cake,
  anniversary: Award,
  rockstar: Star,
  custom: Trophy,
};

const TYPE_COLORS: Record<CampaignType, { active: string; inactive: string }> = {
  birthday: { active: 'bg-brand-gold/10 text-brand-gold', inactive: 'bg-gray-100 text-gray-400' },
  anniversary: { active: 'bg-brand-bronze/10 text-brand-bronze', inactive: 'bg-gray-100 text-gray-400' },
  rockstar: { active: 'bg-purple-50 text-purple-600', inactive: 'bg-gray-100 text-gray-400' },
  custom: { active: 'bg-brand-warm-brown/10 text-brand-warm-brown', inactive: 'bg-gray-100 text-gray-400' },
};

function monthIndex(monthName: string): number {
  const idx = MONTHS.indexOf(monthName as any);
  return idx >= 0 ? idx : 99;
}

function sortCampaignsChronologically(a: Campaign, b: Campaign): number {
  // Most recent first — year descending, then month descending
  if (a.year !== b.year) return b.year - a.year;
  return monthIndex(b.month) - monthIndex(a.month);
}

export function Campaigns() {
  const { campaigns, loading, addCampaign, updateCampaign, deleteCampaign, toggleActive } = useCampaigns();
  const { canManage, isItAdmin } = useRole();
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  if (selectedCampaignId) {
    const campaign = campaigns.find((c) => c.id === selectedCampaignId);
    if (campaign) {
      return (
        <CampaignEntryManager
          campaign={campaign}
          onBack={() => setSelectedCampaignId(null)}
        />
      );
    }
  }

  const handleSave = async (data: Partial<Campaign>) => {
    if (editingCampaign?.id) {
      await updateCampaign(editingCampaign.id, data);
    } else {
      await addCampaign(data);
    }
    setShowForm(false);
    setEditingCampaign(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">Campaigns</h2>
          <p className="text-sm text-brand-taupe mt-0.5">Manage recognition campaigns for the display</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link
              to="/quick-campaign"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand-border text-sm text-brand-text-brown hover:bg-brand-off-white transition-colors"
            >
              <Sparkles size={16} />
              Quick Generate
            </Link>
            <button
              onClick={() => { setEditingCampaign(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-warm-brown text-white text-sm font-medium hover:bg-brand-deep-brown transition-colors"
            >
              <Plus size={16} />
              New Campaign
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-brand-taupe">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-border p-8 text-center">
          <Trophy size={32} className="text-brand-light-gray mx-auto mb-2" />
          <p className="text-sm text-brand-taupe">No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <CampaignGroups
          campaigns={campaigns}
          canManage={canManage}
          isItAdmin={isItAdmin}
          onSelect={setSelectedCampaignId}
          onEdit={(c) => { setEditingCampaign(c); setShowForm(true); }}
          onToggle={toggleActive}
          onDelete={setDeleteTarget}
        />
      )}

      {showForm && (
        <CampaignFormModal
          campaign={editingCampaign}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingCampaign(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Campaign"
        message={`Delete "${deleteTarget?.title}"? All entries will also be removed. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={async () => {
          if (deleteTarget?.id) await deleteCampaign(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function CampaignGroups({
  campaigns,
  canManage,
  isItAdmin,
  onSelect,
  onEdit,
  onToggle,
  onDelete,
}: {
  campaigns: Campaign[];
  canManage: boolean;
  isItAdmin: boolean;
  onSelect: (id: string) => void;
  onEdit: (c: Campaign) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (c: Campaign) => void;
}) {
  const grouped = useMemo(() => {
    const groups: { type: CampaignType; label: string; campaigns: Campaign[] }[] = [];

    for (const type of TYPE_ORDER) {
      const matching = campaigns
        .filter((c) => c.type === type)
        .sort(sortCampaignsChronologically);
      if (matching.length > 0) {
        groups.push({ type, label: TYPE_LABELS[type] + 's', campaigns: matching });
      }
    }

    return groups;
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {grouped.map((group) => {
        const Icon = TYPE_ICONS[group.type];
        return (
          <div key={group.type}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={18} className="text-brand-warm-brown" />
              <h3 className="text-sm font-semibold text-brand-deep-brown uppercase tracking-wide">
                {group.label}
              </h3>
              <span className="text-xs text-brand-taupe">({group.campaigns.length})</span>
            </div>
            <div className="space-y-1.5">
              {group.campaigns.map((campaign) => {
                const colors = TYPE_COLORS[campaign.type];
                const CIcon = TYPE_ICONS[campaign.type];
                return (
                  <div
                    key={campaign.id}
                    className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      campaign.isActive ? colors.active : colors.inactive
                    }`}>
                      <CIcon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-brand-deep-brown">{campaign.title}</p>
                      <p className="text-xs text-brand-taupe">
                        {campaign.month} {campaign.year}
                        {campaign.isActive && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                            Live
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSelect(campaign.id!)}
                        className="p-1.5 rounded hover:bg-brand-cream text-brand-taupe hover:text-brand-warm-brown transition-colors"
                        title="Manage entries"
                      >
                        <ChevronRight size={16} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => onEdit(campaign)}
                            className="p-1.5 rounded hover:bg-brand-cream text-brand-taupe hover:text-brand-warm-brown transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => campaign.id && onToggle(campaign.id, !campaign.isActive)}
                            className="p-1.5 rounded hover:bg-brand-cream text-brand-taupe hover:text-brand-warm-brown transition-colors"
                            title={campaign.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {campaign.isActive ? <ToggleRight size={15} className="text-green-600" /> : <ToggleLeft size={15} />}
                          </button>
                          {isItAdmin && (
                            <button
                              onClick={() => onDelete(campaign)}
                              className="p-1.5 rounded hover:bg-red-50 text-brand-taupe hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CampaignFormModal({
  campaign,
  onSave,
  onClose,
}: {
  campaign: Campaign | null;
  onSave: (data: Partial<Campaign>) => Promise<void>;
  onClose: () => void;
}) {
  const now = new Date();
  const [form, setForm] = useState({
    title: campaign?.title || '',
    type: campaign?.type || ('rockstar' as CampaignType),
    month: campaign?.month || MONTHS[now.getMonth()],
    year: campaign?.year || now.getFullYear(),
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-brand-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold';

  return (
    <Modal open title={campaign ? 'Edit Campaign' : 'New Campaign'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brand-text-brown mb-1">Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className={inputClass}
            placeholder="e.g., March 2026 Rockstars"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-text-brown mb-1">Type</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)} className={inputClass}>
            <option value="rockstar">Rockstar</option>
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-brand-text-brown mb-1">Month</label>
            <select value={form.month} onChange={(e) => set('month', e.target.value)} className={inputClass}>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-brown mb-1">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => set('year', parseInt(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm rounded-lg border border-brand-border text-brand-text-brown hover:bg-brand-off-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.title}
            className="px-4 py-2.5 text-sm rounded-lg bg-brand-warm-brown text-white font-medium hover:bg-brand-deep-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : campaign ? 'Update' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CampaignEntryManager({
  campaign,
  onBack,
}: {
  campaign: Campaign;
  onBack: () => void;
}) {
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useCampaignEntries(campaign.id!, campaign);
  const { employees } = useEmployees();
  const { canManage } = useRole();
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CampaignEntry | null>(null);

  const activeEmployees = employees.filter((e) => e.isActive);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-brand-warm-brown hover:text-brand-deep-brown mb-4"
      >
        <ArrowLeft size={16} />
        Back to Campaigns
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">{campaign.title}</h2>
          <p className="text-sm text-brand-taupe mt-0.5">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditingEntry(null); setShowAddEntry(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-warm-brown text-white text-sm font-medium hover:bg-brand-deep-brown transition-colors"
          >
            <UserPlus size={16} />
            Add Entry
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-brand-taupe">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-border p-8 text-center">
          <p className="text-sm text-brand-taupe">No entries yet. Add employees to this campaign.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-4"
            >
              {entry.photoUrl ? (
                <img src={entry.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-cream flex items-center justify-center text-sm font-medium text-brand-warm-brown">
                  {entry.employeeInitials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-brand-deep-brown">{entry.employeeName}</p>
                <p className="text-xs text-brand-taupe">{entry.employeeTitle}</p>
                {entry.quote && (
                  <p className="text-xs text-brand-text-brown mt-1 line-clamp-1 italic">"{entry.quote}"</p>
                )}
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingEntry(entry); setShowAddEntry(true); }}
                    className="p-1.5 rounded hover:bg-brand-cream text-brand-taupe hover:text-brand-warm-brown transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => entry.id && updateEntry(entry.id, { isVisible: !entry.isVisible })}
                    className="p-1.5 rounded hover:bg-brand-cream text-brand-taupe hover:text-brand-warm-brown transition-colors"
                    title={entry.isVisible ? 'Hide' : 'Show'}
                  >
                    {entry.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    onClick={() => entry.id && deleteEntry(entry.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-brand-taupe hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddEntry && (
        <EntryFormModal
          entry={editingEntry}
          employees={activeEmployees}
          campaignType={campaign.type}
          campaignMonth={campaign.month}
          onSave={async (data) => {
            if (editingEntry?.id) {
              await updateEntry(editingEntry.id, data);
            } else {
              await addEntry(data);
            }
            setShowAddEntry(false);
            setEditingEntry(null);
          }}
          onClose={() => { setShowAddEntry(false); setEditingEntry(null); }}
        />
      )}
    </div>
  );
}

function EntryFormModal({
  entry,
  employees,
  campaignType,
  campaignMonth,
  onSave,
  onClose,
}: {
  entry: CampaignEntry | null;
  employees: any[];
  campaignType: CampaignType;
  campaignMonth: string;
  onSave: (data: Partial<CampaignEntry>) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(entry?.employeeRef || '');
  const [quote, setQuote] = useState(entry?.quote || '');
  const [badgeText, setBadgeText] = useState(
    entry?.badgeText || `${campaignMonth} ${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)}`
  );
  const [saving, setSaving] = useState(false);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee && !entry) return;
    setSaving(true);

    const emp = selectedEmployee;
    const data: Partial<CampaignEntry> = {
      quote,
      badgeText,
    };

    if (emp) {
      data.employeeRef = emp.id;
      data.employeeName = `${emp.firstName} ${emp.lastName}`;
      data.employeeTitle = emp.department || '';
      data.employeeInitials = `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`;
      data.photoUrl = emp.photoUrl || null;
    }

    await onSave(data);
    setSaving(false);
  };

  const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-brand-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold';

  return (
    <Modal open title={entry ? 'Edit Entry' : 'Add Entry'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!entry && (
          <div>
            <label className="block text-sm font-medium text-brand-text-brown mb-1">Employee *</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select an employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} — {emp.department}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-brand-text-brown mb-1">Badge Text</label>
          <input
            type="text"
            value={badgeText}
            onChange={(e) => setBadgeText(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-text-brown mb-1">Quote / Message</label>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="Employee quote or recognition message..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm rounded-lg border border-brand-border text-brand-text-brown hover:bg-brand-off-white transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || (!entry && !selectedEmployeeId)}
            className="px-4 py-2.5 text-sm rounded-lg bg-brand-warm-brown text-white font-medium hover:bg-brand-deep-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : entry ? 'Update' : 'Add Entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
