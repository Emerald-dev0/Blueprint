export default function IntelligencePage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-mono text-slate-500 uppercase tracking-widest">Project Intelligence</h1>
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="p-6 bg-[#141414] border border-white/5 rounded-xl">
          <h3 className="text-[#00FF9D] font-mono text-sm mb-2">Reverse Engineering</h3>
          <p className="text-xs text-slate-400">Analyze URLs and external documents.</p>
        </div>
        <div className="p-6 bg-[#141414] border border-white/5 rounded-xl">
          <h3 className="text-[#00FF9D] font-mono text-sm mb-2">Dependency Graph</h3>
          <p className="text-xs text-slate-400">Visualize system relationships.</p>
        </div>
      </div>
    </div>
  );
}
