/**
 * Settings tab — extracted from Admin.tsx.
 * Renders the sync-errors panel, accountability/whatsapp/trial settings,
 * and the AI (Anthropic) key card.
 */
import { TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SyncErrorsPanel from "@/components/SyncErrorsPanel";
import { AccountabilitySettings } from "@/components/AccountabilitySettings";
import { CoachWhatsAppSettings } from "@/components/CoachWhatsAppSettings";
import { TrialHubSettings } from "@/components/TrialHubSettings";
import { TrialWeekContentEditor } from "@/components/TrialWeekContentEditor";
import { getAnthropicKey, saveAnthropicKey } from "@/lib/store";

export const SettingsTab = () => {
  const [anthropicKey, setAnthropicKey] = getAnthropicKeyState();

  return (
    <TabsContent value="settings" className="space-y-6 mt-6">
      <SyncErrorsPanel />
      <AccountabilitySettings />
      <CoachWhatsAppSettings />
      <TrialHubSettings />
      <TrialWeekContentEditor />
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>AI Settings</CardTitle>
          <CardDescription>
            Configure your AI brain (Claude) for automatic workout generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Anthropic API Key</Label>
            <Input
              type="password"
              value={anthropicKey}
              onChange={(e) => {
                setAnthropicKey(e.target.value);
                saveAnthropicKey(e.target.value);
              }}
              placeholder="sk-ant-api03-..."
            />
            <p className="text-xs text-muted-foreground pt-1">
              Your API key is stored securely on your device and synced to your
              profile. It is used directly from your browser to call Claude.
            </p>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};

// Local state hook so this component owns the anthropic key without needing
// it passed from Admin.
import { useState } from "react";
function getAnthropicKeyState(): [string, (v: string) => void] {
  const [key, setKey] = useState(() => getAnthropicKey());
  return [key, setKey];
}
