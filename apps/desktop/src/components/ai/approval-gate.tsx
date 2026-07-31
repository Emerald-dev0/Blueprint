'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge
} from '@blueprint/ui';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface ApprovalGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  impact?: 'low' | 'medium' | 'high';
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalGate({
  open,
  onOpenChange,
  title,
  description,
  impact = 'medium',
  onApprove,
  onReject
}: ApprovalGateProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2 mb-2">
            <ShieldAlert size={18} className="text-amber-500" />
            <Badge variant={impact === 'high' ? 'error' : 'warning'}>
              {impact} Impact Approval
            </Badge>
          </div>
          <DialogTitle className="text-xl italic font-black uppercase tracking-tight italic">Confirm Intent Seal</DialogTitle>
          <DialogDescription className="font-mono text-xs pt-2">
            An AI Agent is requesting permission to perform a high-privilege action.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3 mt-2">
          <h4 className="text-sm font-bold text-mint">{title}</h4>
          <p className="text-xs text-slate-400 font-mono leading-relaxed">{description}</p>
        </div>

        <DialogFooter className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            onClick={() => { onReject(); onOpenChange(false); }}
            className="flex-grow font-bold uppercase tracking-tighter"
          >
            <XCircle size={16} className="mr-2" />
            Reject
          </Button>
          <Button
            variant="primary"
            onClick={() => { onApprove(); onOpenChange(false); }}
            className="flex-grow font-bold uppercase tracking-tighter"
          >
            <CheckCircle2 size={16} className="mr-2" />
            Seal Intent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
