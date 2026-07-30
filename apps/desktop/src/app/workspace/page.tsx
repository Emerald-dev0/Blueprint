export default function WorkspacePage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-mono text-slate-500 uppercase tracking-widest">Active Workspace</h1>
      <div className="mt-8 p-12 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
        <p className="text-slate-400 font-mono">No active project. Select a project from the Rail to begin.</p>
      </div>
    </div>
  );
}
