export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-mono text-slate-500 uppercase tracking-widest">Settings</h1>

      <div className="mt-8 space-y-8">
        <section>
          <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-tighter">AI Providers</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#141414] border border-white/5 rounded-xl">
              <span className="font-mono text-sm">Google Gemini</span>
              <span className="text-[10px] text-slate-500 px-2 py-1 bg-white/5 rounded italic">Unconfigured</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#141414] border border-white/5 rounded-xl">
              <span className="font-mono text-sm">Anthropic Claude</span>
              <span className="text-[10px] text-slate-500 px-2 py-1 bg-white/5 rounded italic">Unconfigured</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
