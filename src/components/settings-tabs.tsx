import type { Channel } from "@/lib/beaver/channel";
import type { MetricWithValue } from "@/lib/beaver/metric";
import type { Project } from "@/lib/beaver/project";
import type { AlertRuleWithChannel } from "@/lib/beaver/alert-rule";
import { useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import APIKey from "./api-key";
import AlertSettings from "./alert-settings";
import ChannelSettings from "./channel-settings";
import MetricSettings from "./metric-settings";
import NotificationSettings from "./notification-settings";
import ProjectDangerZone from "./project-danger-zone";
import ProjectMembers from "./project-members";
import ProjectRename from "./project-rename";

interface Props {
  project: Project;
  channels: Channel[];
  metrics: MetricWithValue[];
  alertRules: AlertRuleWithChannel[];
  isOwner: boolean;
  currentUserId: number;
  initialEmail: string | null;
  subscribedChannelIds: number[];
}

const row = "flex flex-col sm:flex-row sm:items-center w-full sm:justify-between gap-2";
const label = "font-medium shrink-0";

export default function SettingsTabs({
  project,
  channels,
  metrics,
  alertRules,
  isOwner,
  currentUserId,
  initialEmail,
  subscribedChannelIds,
}: Props) {
  const createdAt = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "—";
  const defaultTab = isOwner ? "general" : "channels";
  const [tab, setTab] = useState(defaultTab);
  // Track which tabs have been visited so their content stays mounted after first render.
  const visited = useRef(new Set([defaultTab]));
  const show = (t: string) => tab === t || visited.current.has(t);

  const handleTabChange = (value: string) => {
    visited.current.add(value);
    setTab(value);
  };

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-6 mt-6 md:mt-0 flex flex-wrap h-auto w-auto gap-1">
        {isOwner && <TabsTrigger value="general">General</TabsTrigger>}
        <TabsTrigger value="channels">Channels</TabsTrigger>
        {isOwner && <TabsTrigger value="members">Members</TabsTrigger>}
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
        <TabsTrigger value="alerts">Alerts</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        {isOwner && (
          <TabsTrigger value="danger" className="text-destructive">
            Danger Zone
          </TabsTrigger>
        )}
      </TabsList>

      {isOwner && (
        <TabsContent value="general" className="mt-6 md:mt-0">
          <div className="flex flex-col space-y-4">
            <div className={row}>
              <h3 className={label}>Project Name</h3>
              <ProjectRename project={project} />
            </div>
            <div className={row}>
              <h3 className={label}>Created</h3>
              <p className="text-muted-foreground">{createdAt}</p>
            </div>
            <div className={row}>
              <h3 className={label}>API Key</h3>
              <APIKey project={project} />
            </div>
          </div>
        </TabsContent>
      )}

      <TabsContent value="channels" className="mt-6 md:mt-0">
        {show("channels") && <ChannelSettings channels={channels} project={project} />}
      </TabsContent>

      {isOwner && (
        <TabsContent value="members" className="mt-6 md:mt-0">
          {show("members") && (
            <ProjectMembers projectId={project.id} currentUserId={currentUserId} />
          )}
        </TabsContent>
      )}

      <TabsContent value="metrics" className="mt-6 md:mt-0">
        {show("metrics") && <MetricSettings metrics={metrics} projectId={project.id} />}
      </TabsContent>

      <TabsContent value="alerts" className="mt-6 md:mt-0">
        {show("alerts") && <AlertSettings channels={channels} initialRules={alertRules} />}
      </TabsContent>

      <TabsContent value="notifications" className="mt-6 md:mt-0">
        {show("notifications") && (
          <NotificationSettings
            channels={channels}
            initialEmail={initialEmail}
            subscribedChannelIds={subscribedChannelIds}
          />
        )}
      </TabsContent>

      {isOwner && (
        <TabsContent value="danger" className="mt-6 md:mt-0">
          {show("danger") && <ProjectDangerZone project={project} />}
        </TabsContent>
      )}
    </Tabs>
  );
}
