import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { QrCode, Search, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { recordScanEvent, resolveScanCode, linkBarcode, flushScanQueue } from "@/lib/store";
import { toast } from "sonner";

const CheckIn = () => {
  const [site, setSite] = useState("main");
  const [scanCode, setScanCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roster, setRoster] = useState<any[]>([]);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkDialog, setLinkDialog] = useState<{ barcode: string; members: any[] } | null>(null);
  const [linkEmail, setLinkEmail] = useState("");

  useEffect(() => {
    loadRoster();
    loadRecentScans();
    flushScanQueue();
    const interval = setInterval(() => {
      loadRecentScans();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadRoster = async () => {
    const { data } = await supabase.from('gym_members')
      .select('*')
      .order('full_name', { ascending: true });
    if (data) setRoster(data);
  };

  const loadRecentScans = async () => {
    const { data } = await supabase.from('scan_events')
      .select('*, gym_members(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setRecentScans(data);
  };

  const handleScan = async () => {
    if (!scanCode.trim()) return;
    setIsProcessing(true);
    try {
      const member = await resolveScanCode(scanCode.trim());
      if (member) {
        const result = await recordScanEvent(site, scanCode.trim(), member.id);
        if (result.success) {
          toast.success(`${member.full_name || 'Member'} checked in`);
        } else {
          toast.error("Check-in saved offline — will sync when online");
        }
      } else {
        // Unknown barcode — offer to link
        const { data: unmatchedMembers } = await supabase.from('gym_members')
          .select('*')
          .is('barcode', null)
          .order('full_name', { ascending: true });
        setLinkDialog({ barcode: scanCode.trim(), members: unmatchedMembers || [] });
        setLinkEmail("");
      }
      setScanCode("");
      loadRecentScans();
    } catch (e: any) {
      toast.error(`Check-in failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRosterCheckIn = async (member: any) => {
    setIsProcessing(true);
    try {
      const code = member.barcode || member.scan_token || member.id;
      const result = await recordScanEvent(site, code, member.id);
      if (result.success) {
        toast.success(`${member.full_name || 'Member'} checked in`);
      } else {
        toast.error("Check-in saved offline — will sync when online");
      }
      loadRecentScans();
    } catch (e: any) {
      toast.error(`Check-in failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkBarcode = async () => {
    if (!linkDialog || !linkEmail) return;
    const member = linkDialog.members.find(m => 
      m.email.toLowerCase().trim() === linkEmail.toLowerCase().trim()
    );
    if (!member) {
      toast.error("No member found with that email");
      return;
    }
    const result = await linkBarcode(member.id, linkDialog.barcode);
    if (result.success) {
      toast.success("Barcode linked — checking in...");
      await recordScanEvent(site, linkDialog.barcode, member.id);
      setLinkDialog(null);
      setLinkEmail("");
      loadRoster();
      loadRecentScans();
    } else {
      toast.error("Failed to link barcode");
    }
  };

  const filteredRoster = roster.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (m.full_name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
  });

  const statusColor = (status: string) => {
    if (status === 'active') return 'text-primary';
    if (status === 'cancelled') return 'text-destructive';
    return 'text-muted-foreground';
  };

  const scanResultIcon = (result: string) => {
    if (result === 'granted') return <Check className="h-4 w-4 text-primary" />;
    if (result === 'denied_lapsed') return <X className="h-4 w-4 text-destructive" />;
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading tracking-wider font-bold">Reception Check-In</h1>
            <p className="text-muted-foreground text-sm mt-1">Scan a barcode or tap a member to check in.</p>
          </div>
          <div className="w-40">
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Main Site</SelectItem>
                <SelectItem value="unit_1b">Unit 1B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scan input */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
<QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  className="pl-10 text-lg h-12"
                  placeholder="Scan or enter barcode..."
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  autoFocus
                />
              </div>
              <Button size="lg" onClick={handleScan} disabled={isProcessing || !scanCode.trim()} className="gap-2">
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />}
                Check In
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Roster search */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Member Roster</CardTitle>
            <CardDescription>Tap a member to check them in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredRoster.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No members found.</p>
              )}
              {filteredRoster.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleRosterCheckIn(m)}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">{m.full_name || m.email}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${statusColor(m.status)}`}>
                      {m.status === 'active' ? 'Active' : m.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                    </span>
                    {m.product && <span className="text-xs text-muted-foreground">{m.product}</span>}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent scans */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Recent Check-Ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentScans.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No check-ins yet today.</p>
              )}
              {recentScans.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-3">
                    {scanResultIcon(s.result)}
                    <div>
                      <p className="text-sm font-medium">{s.gym_members?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleTimeString()} · {s.site}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.result === 'granted' ? 'Granted' : s.result === 'denied_lapsed' ? 'Denied' : 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Link unknown barcode dialog */}
      <Dialog open={!!linkDialog} onOpenChange={(open) => !open && setLinkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Barcode <span className="font-mono font-bold">{linkDialog?.barcode}</span> isn't linked yet.
              Enter the member's email to link it.
            </p>
            <div className="space-y-2">
              <Label>Member Email</Label>
              <Input
                placeholder="member@email.com"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                list="unmatched-members"
              />
              <datalist id="unmatched-members">
                {linkDialog?.members.map(m => (
                  <option key={m.id} value={m.email}>{m.full_name} — {m.email}</option>
                ))}
              </datalist>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)}>Cancel</Button>
            <Button onClick={handleLinkBarcode} disabled={!linkEmail}>Link & Check In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckIn;
