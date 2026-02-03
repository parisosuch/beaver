import { getChannelAvailableTags } from "@/lib/beaver/tags";

export async function GET({
  params,
}: {
  params: { channelID: string };
}) {
  try {
    const tags = await getChannelAvailableTags(parseInt(params.channelID));
    return new Response(JSON.stringify(tags), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Error) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error(err);
    return new Response(
      JSON.stringify({ error: "An unknown error has occurred." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
