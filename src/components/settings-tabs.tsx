import type { Channel } from "@/lib/beaver/channel";
import type { MetricWithValue } from "@/lib/beaver/metric";
import type { Project } from "@/lib/beaver/project";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import APIKey from "./api-key";
import ChangePasswordForm from "./change-password-form";
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
  isOwner: boolean;
  currentUserId: number;
  initialEmail: string | null;
  initialEnabled: boolean;
}

const row = "flex flex-col sm:flex-row sm:items-center w-full sm:justify-between gap-2";
const label = "font-medium shrink-0";

export default function SettingsTabs({
  project,
  channels,
  metrics,
  isOwner,
  currentUserId,
  initialEmail,
  initialEnabled,
}: Props) {
  const createdAt = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "—";

  return (
    <Tabs defaultValue={isOwner ? "general" : "channels"} className="w-full">
      <TabsList className="mb-6 mt-6 md:mt-0 flex flex-wrap h-auto w-auto gap-1">
        {isOwner && <TabsTrigger value="general">General</TabsTrigger>}
        <TabsTrigger value="channels">Channels</TabsTrigger>
        {isOwner && <TabsTrigger value="members">Members</TabsTrigger>}
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
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
        <ChannelSettings channels={channels} project={project} />
      </TabsContent>

      {isOwner && (
        <TabsContent value="members" className="mt-6 md:mt-0">
          <ProjectMembers projectId={project.id} currentUserId={currentUserId} />
        </TabsContent>
      )}

      <TabsContent value="metrics" className="mt-6 md:mt-0">
        <MetricSettings metrics={metrics} projectId={project.id} />
      </TabsContent>

      <TabsContent value="notifications" className="mt-6 md:mt-0">
        <NotificationSettings
          projectId={project.id}
          initialEmail={initialEmail}
          initialEnabled={initialEnabled}
        />
      </TabsContent>

      <TabsContent value="account" className="mt-6 md:mt-0">
        <ChangePasswordForm />
      </TabsContent>

      {isOwner && (
        <TabsContent value="danger" className="mt-6 md:mt-0">
          <ProjectDangerZone project={project} />
        </TabsContent>
      )}
    </Tabs>
  );
}
