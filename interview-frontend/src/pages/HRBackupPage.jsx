import { useCallback, useState } from "react";
import { ArrowLeft, Download, AlertCircle, CheckCircle2, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { hrApi } from "../services/api";

export default function HRBackupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [backupData, setBackupData] = useState(null);

  const handleCreateBackup = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await hrApi.localBackup();
      setBackupData(data);
      setMessage("Backup created successfully!");
    } catch (backupError) {
      setError(backupError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleDownloadBackup() {
    if (!backupData) {
      setError("No backup data available");
      return;
    }

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const stats = backupData
    ? {
        jds: backupData.jds?.length || 0,
        candidates: backupData.candidates?.length || 0,
        applications: backupData.applications?.length || 0,
        interviews: backupData.interviews?.length || 0,
      }
    : null;

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
              <p className="text-lg text-slate-600 dark:text-slate-400">Export all system data to a JSON file for backup or archiving.</p>
            </div>
            <Database size={32} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-4">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                This will create a comprehensive backup of all job descriptions, candidates, applications, and interview data.
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

            {backupData && (
              <button
                onClick={handleDownloadBackup}
                className="w-full px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center justify-center"
              >
                <Download size={20} className="mr-2" />
                Download Backup File
              </button>
            )}
          </div>
        </div>

        {stats && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Backup Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Job Descriptions</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.jds}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Candidates</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.candidates}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Applications</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.applications}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Interviews</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.interviews}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Backup Info</h3>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  <span className="font-bold text-slate-900 dark:text-white">Created:</span> {new Date().toLocaleString()}
                </p>
                <p>
                  <span className="font-bold text-slate-900 dark:text-white">Format:</span> JSON
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">You can use this backup to restore data or migrate to another system.</p>
              </div>
            </div>
          </div>
        )}

        {!stats && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex items-center justify-center text-center">
            <div>
              <Database size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Create a backup to see data summary</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Backup Best Practices</h3>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0" />
            <span>Create backups regularly, especially before major system updates</span>
          </li>
          <li className="flex items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0" />
            <span>Store backup files in a secure location with proper access controls</span>
          </li>
          <li className="flex items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0" />
            <span>Test restoring from backups periodically to ensure data integrity</span>
          </li>
          <li className="flex items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0" />
            <span>Include backup files in your disaster recovery plan</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
