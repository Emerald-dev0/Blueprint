'use client';

import {
  Button,
  Input,
  Badge,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  AIProposalSurface,
  ActivityIndicator
} from '@blueprint/ui';
import { Terminal, Box, Shield, Zap, Info } from 'lucide-react';

function ColorSwatch({ color, label, hex, textColor = "text-white" }: { color: string; label: string; hex: string; textColor?: string }) {
  return (
    <div className="space-y-2">
      <div className={`h-24 w-full rounded-lg border border-white/5 ${color} flex items-end p-2`}>
        <span className={`text-[10px] font-bold uppercase tracking-tighter ${textColor}`}>{hex}</span>
      </div>
      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">{label}</p>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <TooltipProvider>
      <div className="p-12 space-y-16 max-w-5xl mx-auto">
        <header className="space-y-4">
          <Badge variant="primary">Design System</Badge>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase">Ink & Mint</h1>
          <p className="text-slate-500 font-mono">The visual operating system for Blueprint.</p>
        </header>

        <Separator />

        {/* Colors */}
        <section className="space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">Color Palette</h2>
          <div className="grid grid-cols-5 gap-4">
            <ColorSwatch color="bg-[#0B0B0B]" label="Ink" hex="#0B0B0B" />
            <ColorSwatch color="bg-[#00FF9D]" label="Mint" hex="#00FF9D" textColor="text-black" />
            <ColorSwatch color="bg-[#141414]" label="Surface 1" hex="#141414" />
            <ColorSwatch color="bg-[#1E1E1E]" label="Surface 2" hex="#1E1E1E" />
            <ColorSwatch color="bg-[#262626]" label="Surface 3" hex="#262626" />
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">Typography</h2>
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Inter (UI Sans)</p>
              <div className="grid grid-cols-2 gap-4">
                <p className="text-4xl font-black tracking-tighter uppercase">Command Center</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Blueprint prioritizes high-performance legibility and technical precision.
                  Designed for prolonged focus in professional engineering environments.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">JetBrains Mono (Data/Code)</p>
              <div className="p-4 bg-[#141414] rounded-lg border border-white/5">
                <code className="text-sm text-[#00FF9D]">
                  fn main() &#123; println!("Blueprint initialized"); &#125;
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger Zone</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><Zap size={16}/></Button>
          </div>
        </section>

        {/* Inputs */}
        <section className="space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">Inputs</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Default Input</label>
              <Input placeholder="Enter command..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Disabled State</label>
              <Input placeholder="Locked field" disabled />
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">Badges</h2>
          <div className="flex gap-4">
            <Badge>Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </section>

        {/* Overlays */}
        <section className="space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">Overlays</h2>
          <div className="flex gap-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover for Tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>System Diagnostics Running</p>
              </TooltipContent>
            </Tooltip>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Execution</DialogTitle>
                  <DialogDescription>
                    This will apply 12 changes to the project structure.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="primary">Seal Intent</Button>
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Dropdown Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Box size={14} className="mr-2" />
                  Analyze Repository
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield size={14} className="mr-2" />
                  Security Audit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500">
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        {/* Tabs */}
        <section className="space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">Tabs</h2>
          <Tabs defaultValue="architecture" className="w-full">
            <TabsList>
              <TabsTrigger value="architecture">Architecture</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="git">GitHub</TabsTrigger>
            </TabsList>
            <TabsContent value="architecture" className="p-4 bg-[#141414] rounded-lg border border-white/5 mt-4">
              <p className="text-slate-400 font-mono text-sm text-center py-12">Architecture graph will render here.</p>
            </TabsContent>
          </Tabs>
        </section>

        {/* AI Components */}
        <section className="space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">AI Foundations</h2>
          <div className="space-y-8">
            <ActivityIndicator label="AI Researching project structure..." />

            <AIProposalSurface className="p-6 max-w-2xl" isActive>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="primary">Implementation Plan</Badge>
                <span className="text-[10px] font-mono text-[#00FF9D]">Drafting...</span>
              </div>
              <p className="text-sm font-mono text-slate-300 leading-relaxed">
                Based on your request, I recommend implementing the OAuth2 flow using the `@blueprint/auth` package.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button size="sm" variant="ghost">Reject</Button>
                <Button size="sm" variant="primary">Seal Intent</Button>
              </div>
            </AIProposalSurface>
          </div>
        </section>

        <footer className="pt-12 text-center">
          <p className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">Blueprint Design System v0.1.0</p>
        </footer>
      </div>
    </TooltipProvider>
  );
}
