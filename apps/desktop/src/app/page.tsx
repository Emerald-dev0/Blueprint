export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-[#0B0B0B] text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col gap-8">
        <h1 className="text-6xl font-black tracking-tighter text-[#00FF9D]">BLUEPRINT</h1>
        <p className="text-xl text-slate-400">AI Engineering Command Center</p>
        <div className="mt-8 p-4 border border-slate-800 rounded-lg bg-[#141414]">
          <p>Initial handshake complete. System ready.</p>
        </div>
      </div>
    </main>
  );
}
