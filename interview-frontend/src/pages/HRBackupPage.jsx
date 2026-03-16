import { useCallback, useState } from "react";
import { ArrowLeft, Download, AlertCircle, CheckCircle2, Database, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { hrApi } from "../services/api";

export default function HRBackupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  // FIX C3: backupData is a Blob (zip file) — store it directly, don't try to JSON.parse it
  const [backupBlob, setBackupBlob] = useState(null);
  const [backupDate, setBackupDate] = useState(null);

  const handleCreateBackup = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setBackupBlob(null);
    setBackupDate(null);

    try {
      // hrApi.localBackup() returns a Blob (application/zip from backend FileResponse)
      const blob = await hrApi.localBackup();
      setBackupBlob(blob);
      setBackupDate(new Date());
      setMessage("Backup created successfully! Click Download to save the file.");
    } catch (backupError) {
      setError(backupError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // FIX C3: Create object URL from the blob directly — don't JSON.stringify a Blob
  function handleDownloadBackup() {
    if (!backupBlob) {
      setError("No backup available. Please create one first.");
      return;
    }

    const url = URL.createObjectURL(backupBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interview_bot_backup_${new Date().toISOString().split("T")[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Clean up the object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/hr" className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Backup</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">Export all system data as a zip archive containing the database and uploaded files.</p>
            </div>
            <Database size={32} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-4">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                This creates a zip archive containing the full database and all uploaded resumes and proctoring snapshots. Store it securely.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/50">
                <p className="text-sm font-bold text-red-900 dark:text-red-300 flex items-start">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                  {error}
                </p>
              </div>
            )}

            {message && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-start">
                  <CheckCircle2 size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                  {message}
                </p>
              </div>
            )}

            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50"
            >
              {loading ? "Creating backup..." : "Create Backup"}
            </button>

            {backupBlob && (
              <button
                onClick={handleDownloadBackup}
                className="w-full px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Download Backup (.zip)
              </button>
            )}
          </div>
        </div>

        {/* Backup info panel */}
        {backupBlob ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Package size={16} className="text-emerald-500" />
                Backup Ready
              </h3>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span>Format</span>
                  <span className="font-bold text-slate-900 dark:text-white">ZIP Archive</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span>Size</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {backupBlob.size > 1024 * 1024
                      ? `${(backupBlob.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${(backupBlob.size / 1024).toFixed(0)} KB`}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span>Created</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {backupDate?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Contents</h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Full SQLite database (all candidates, interviews, results)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Uploaded resumes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Proctoring snapshots</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>manifest.json with record counts</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex items-center justify-center text-center">
            <div>
              <Database size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Create a backup to download the archive</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Backup Best Practices</h3>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0" />
            <span>Create backups before major changes or at end of each interview batch</span>
          </li>
          <li className="flex items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0" />
            <span>Store backup files in a secure location with proper access controls</span>
          </li>
          <li className="flex items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0" />
            <span>The zip includes the raw SQLite file — keep it confidential</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
