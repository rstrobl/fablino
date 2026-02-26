import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWaitlist, deleteWaitlistEntry } from '../api';
import { Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export function Waitlist() {
  const qc = useQueryClient();
  const { data: entries = [], isLoading } = useQuery({ queryKey: ['waitlist'], queryFn: fetchWaitlist });

  const delMut = useMutation({
    mutationFn: deleteWaitlistEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waitlist'] }); toast.success('Deleted'); },
  });

  const exportCsv = () => {
    const header = 'Email,Hero Name,Age,Prompt,Side Characters,Date\n';
    const rows = entries.map((e) =>
      [e.email, e.heroName, e.heroAge, `"${e.prompt}"`, JSON.stringify(e.sideCharacters), new Date(e.createdAt).toLocaleDateString()].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'waitlist.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-bold">Waitlist</h2>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors">
          <Download size={16} /> Export CSV
        </button>
      </div>
      {isLoading ? (
        <p className="text-text-muted">Loading…</p>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-left">
                <th className="p-3">Email</th>
                <th className="p-3">Hero</th>
                <th className="p-3">Age</th>
                <th className="p-3">Prompt</th>
                <th className="p-3">Side Characters</th>
                <th className="p-3">Date</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                  <td className="p-3">{e.email}</td>
                  <td className="p-3 font-medium">{e.heroName}</td>
                  <td className="p-3">{e.heroAge}</td>
                  <td className="p-3 max-w-xs truncate">{e.prompt}</td>
                  <td className="p-3 text-text-muted text-xs">{JSON.stringify(e.sideCharacters)}</td>
                  <td className="p-3 text-text-muted">{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <button
                      onClick={() => { if (confirm('Delete?')) delMut.mutate(e.id); }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && <p className="p-6 text-center text-text-muted">No entries</p>}
        </div>
      )}
    </div>
  );
}
