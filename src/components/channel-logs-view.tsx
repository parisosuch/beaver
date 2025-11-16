import type { Channel } from "@/lib/beaver/channel";
import type { Event } from "@/lib/beaver/event";
import { useEffect, useState } from "react";

export default function ChannelLogsView({ channel }: { channel: Channel }) {
  const [logs, setLogs] = useState<Event[]>([]);

  const getLogs = async () => {
    const res = await fetch(`/api/event?channel_id=${channel.id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (res.status !== 200) {
      // TODO: handle error
      console.error(data);
      return [];
    }
    return data;
  };

  useEffect(() => {
    getLogs().then((res) => {
      setLogs(res);
    });
  }, [channel]);
  if (logs.length === 0) {
    return (
      <div className="flex w-full justify-center">
        <h1 className="text-xl text-center font-medium">
          This channel has no logs :(
        </h1>
      </div>
    );
  }
  return <div>It has logs</div>;
}
