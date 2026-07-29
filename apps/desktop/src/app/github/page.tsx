export default function GitHubPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-mono text-slate-500 uppercase tracking-widest">GitHub Ecosystem</h1>
      <div className="mt-8 p-12 bg-[#141414] border border-white/5 rounded-2xl flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <span className="text-xl">🐙</span>
        </div>
        <p className="text-slate-400 font-mono text-sm">Connect your GitHub account to sync issues and PRs.</p>
        <button className="mt-6 px-6 py-2 bg-white text-black rounded-lg font-bold hover:bg-slate-200 transition-colors">
          Connect GitHub
        </button>
      </div>
    </div>
  );
}
