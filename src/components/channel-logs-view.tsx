import type { Channel } from "@/lib/beaver/channel";
import type { Log } from "@/pages/api/log";
import { useEffect, useState } from "react";

export default function ChannelLogsView({ channel }: { channel: Channel }) {
  const [logs, setLogs] = useState<Log[]>([]);

  const getLogs = async () => {
    const res = await fetch(`/api/log?channel_id=${channel.id}`, {
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
    console.log("Getting logs for channel: ", channel.id);
    getLogs().then((res) => {
      setLogs(res);
    });
  }, [channel]);
  return <div>{channel.name}</div>;
}
