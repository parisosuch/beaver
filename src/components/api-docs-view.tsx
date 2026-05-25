import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { CheckIcon, CopyIcon, TerminalIcon } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

function CodeBlock({ code, language = "bash", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Map common language names to prism language keys
  const languageMap: Record<string, string> = {
    javascript: "jsx",
    js: "jsx",
    typescript: "tsx",
    ts: "tsx",
    python: "python",
    py: "python",
    go: "go",
    golang: "go",
    bash: "bash",
    shell: "bash",
    json: "json",
    curl: "bash",
  };

  const prismLanguage = languageMap[language.toLowerCase()] || language;

  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-800 shadow-lg">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <TerminalIcon size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-300">{title}</span>
          </div>
          <span className="text-xs text-gray-500 uppercase tracking-wider">{language}</span>
        </div>
      )}
      <Highlight theme={themes.nightOwl} code={code.trim()} language={prismLanguage}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className="p-4 overflow-x-auto text-sm leading-relaxed"
            style={{ ...style, margin: 0, background: "#011627" }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} className="table-row">
                <span className="table-cell pr-4 text-gray-600 text-right select-none w-8">
                  {i + 1}
                </span>
                <span className="table-cell">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
      <button
        className="absolute top-2 right-2 p-2 rounded-lg bg-gray-700/50 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-600 text-gray-300 hover:text-white"
        onClick={handleCopy}
        aria-label="Copy code"
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      </button>
    </div>
  );
}

interface ApiDocsViewProps {
  apiKey: string;
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info";
}) {
  const variants = {
    default:
      "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10",
    success:
      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    warning:
      "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    info: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-500",
    POST: "bg-emerald-500",
    PUT: "bg-amber-500",
    DELETE: "bg-red-500",
    PATCH: "bg-purple-500",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-bold text-white ${colors[method] || "bg-gray-500"}`}
    >
      {method}
    </span>
  );
}

export default function ApiDocsView({ apiKey }: ApiDocsViewProps) {
  const displayKey = apiKey;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const sections = [
    { id: "overview", title: "Overview" },
    { id: "authentication", title: "Authentication" },
    {
      id: "create-event",
      title: "Create Event",
      children: [
        { id: "request-headers", title: "Request Headers" },
        { id: "request-body", title: "Request Body" },
        { id: "example-request", title: "Single Event" },
        { id: "batch-request", title: "Batch Events" },
        { id: "success-response", title: "Response Format" },
        { id: "error-responses", title: "Error Responses" },
      ],
    },
    {
      id: "notifications",
      title: "Notifications",
    },
    {
      id: "tags",
      title: "Tags",
      children: [
        { id: "tag-type-inference", title: "Type Inference" },
        { id: "tag-type-consistency", title: "Type Consistency" },
      ],
    },
    {
      id: "metrics",
      title: "Metrics",
      children: [
        { id: "metrics-gauge", title: "Gauge" },
        { id: "metrics-counter", title: "Counter" },
        { id: "metrics-timeseries", title: "Timeseries" },
      ],
    },
    {
      id: "code-examples",
      title: "Code Examples",
      children: [
        { id: "javascript", title: "JavaScript / Node.js" },
        { id: "python", title: "Python" },
        { id: "go", title: "Go" },
      ],
    },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="p-4 md:p-8 border-b">
        <h1 className="text-2xl font-semibold">API Documentation</h1>
      </div>

      <div className="w-full flex flex-col items-center mt-8 pb-16">
        <div className="w-full px-4 md:w-3/4 md:px-0 space-y-12">
          {/* Table of Contents */}
          <nav className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">
              Table of Contents
            </h2>
            <ul className="space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline transition-colors"
                  >
                    {section.title}
                  </a>
                  {section.children && (
                    <ul className="ml-4 mt-2 space-y-1">
                      {section.children.map((child) => (
                        <li key={child.id}>
                          <a
                            href={`#${child.id}`}
                            className="text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:underline transition-colors text-sm"
                          >
                            {child.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Overview */}
          <section id="overview">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Overview
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg leading-relaxed">
              The Beaver API allows you to send events from your applications to track important
              activities. Events are organized by channels within your project.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Base URL</span>
              </div>
              <code className="text-lg font-mono text-blue-900 dark:text-blue-300 bg-white/60 dark:bg-white/10 px-3 py-1.5 rounded-lg">
                {baseUrl}/api
              </code>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Authentication
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg leading-relaxed">
              All API requests require authentication via the{" "}
              <code className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                X-API-Key
              </code>{" "}
              header. You can find your project's API key in the{" "}
              <a
                href="settings"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline underline-offset-2"
              >
                Settings
              </a>{" "}
              page.
            </p>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                  Your API Key
                </span>
                <Badge variant="warning">Keep this secret</Badge>
              </div>
              <code className="block font-mono text-amber-900 dark:text-amber-300 bg-white/60 dark:bg-white/10 px-4 py-3 rounded-lg text-sm break-all">
                {displayKey}
              </code>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <code className="text-gray-100 font-mono text-sm">X-API-Key: {displayKey}</code>
            </div>
          </section>

          {/* Create Event Endpoint */}
          <section id="create-event">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Create Event
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg leading-relaxed">
              Send one event or a batch of up to 100 events to channels in your project. The
              endpoint accepts either a single event object or an array — the response is always an
              array of per-event results.
            </p>
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-5 mb-6">
              <p className="text-blue-800 dark:text-blue-300 font-semibold mb-2">
                Event naming convention
              </p>
              <p className="text-blue-700 dark:text-blue-400 text-sm mb-2">
                Every event has a machine identifier (
                <code className="bg-blue-100 dark:bg-white/10 px-1 rounded">name</code>) in{" "}
                <code className="bg-blue-100 dark:bg-white/10 px-1 rounded">object.action</code>{" "}
                form and a human-readable{" "}
                <code className="bg-blue-100 dark:bg-white/10 px-1 rounded">title</code>. Names must
                match{" "}
                <code className="bg-blue-100 dark:bg-white/10 px-1 rounded">
                  /^[a-z][a-z_]*\.[a-z][a-z_]*$/
                </code>{" "}
                — lowercase, letters and underscores, exactly two segments.
              </p>
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                Examples:{" "}
                <code className="bg-blue-100 dark:bg-white/10 px-1 rounded">user.signed_up</code>,{" "}
                <code className="bg-blue-100 dark:bg-white/10 px-1 rounded">payment.completed</code>
                ,{" "}
                <code className="bg-blue-100 dark:bg-white/10 px-1 rounded">
                  server.status_changed
                </code>
                . The <code className="bg-blue-100 dark:bg-white/10 px-1 rounded">legacy</code>{" "}
                object is reserved for migrated events and cannot be sent.
              </p>
            </div>

            {/* Endpoint */}
            <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl mb-8">
              <MethodBadge method="POST" />
              <code className="text-gray-100 font-mono text-lg">/api/event</code>
            </div>

            {/* Request Headers */}
            <h3
              id="request-headers"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Request Headers
            </h3>
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 mb-8">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Header
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Required
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        X-API-Key
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      Your project's API key for authentication
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        Content-Type
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      Must be{" "}
                      <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">
                        application/json
                      </code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Request Body */}
            <h3
              id="request-body"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Request Body
            </h3>
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 mb-8">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Field
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Required
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        name
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      Machine identifier in{" "}
                      <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">
                        object.action
                      </code>{" "}
                      form (e.g.{" "}
                      <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">
                        server.status_changed
                      </code>
                      ). Must match{" "}
                      <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">
                        /^[a-z][a-z_]*\.[a-z][a-z_]*$/
                      </code>
                      . The{" "}
                      <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">legacy</code>{" "}
                      object is reserved.
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        title
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      Human-readable description of this specific event instance
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        channel
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      The channel name to send the event to
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        description
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3">
                      <Badge>Optional</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      Additional details about the event
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        icon
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3">
                      <Badge>Optional</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      An emoji or icon for the event
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        tags
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">object</td>
                    <td className="px-4 py-3">
                      <Badge>Optional</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      Key-value pairs for additional metadata. Types are inferred from the JSON
                      value. See{" "}
                      <a href="#tags" className="text-blue-600 dark:text-blue-400 hover:underline">
                        Tags
                      </a>
                      .
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        notify
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">boolean</td>
                    <td className="px-4 py-3">
                      <Badge>Optional</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      If <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">true</code>,
                      sends an email notification to project members who have opted in. Requires{" "}
                      <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">
                        RESEND_API_KEY
                      </code>{" "}
                      to be configured. See{" "}
                      <a
                        href="#notifications"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Notifications
                      </a>
                      .
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Single Event Example */}
            <h3
              id="example-request"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Single Event
            </h3>
            <div className="mb-8">
              <CodeBlock
                title="cURL — single event"
                language="bash"
                code={`curl -X POST ${baseUrl}/api/event \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayKey}" \\
  -d '{
    "name": "user.signed_up",
    "title": "New user registered via Google",
    "channel": "signups",
    "description": "New user registration",
    "icon": "🎉",
    "tags": {
      "plan": "premium",
      "source": "landing-page"
    }
  }'`}
              />
            </div>

            {/* Batch Example */}
            <h3
              id="batch-request"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Batch Events
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Pass an array of up to{" "}
              <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">100</code> event objects
              to ingest them in a single request. The batch is atomic — if any event fails
              validation or insertion, the entire batch is rejected and nothing is written.
            </p>
            <div className="mb-8">
              <CodeBlock
                title="cURL — batch"
                language="bash"
                code={`curl -X POST ${baseUrl}/api/event \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayKey}" \\
  -d '[
    {
      "name": "user.signed_up",
      "title": "Alice registered",
      "channel": "signups"
    },
    {
      "name": "payment.completed",
      "title": "Alice paid $99.99",
      "channel": "payments",
      "tags": { "amount": 99.99 }
    }
  ]'`}
              />
            </div>

            {/* Response Format */}
            <h3
              id="success-response"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Response Format
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              On success the response is always an array — one created event object per input.
            </p>
            <div className="space-y-4 mb-8">
              <CodeBlock
                title="200 OK — all succeeded"
                language="json"
                code={`[
  {
    "id": 123,
    "eventObject": "user",
    "eventAction": "signed_up",
    "title": "Alice registered",
    "description": null,
    "icon": null,
    "tags": {},
    "projectId": 1,
    "channelName": "signups",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]`}
              />
            </div>

            {/* Error Responses */}
            <h3
              id="error-responses"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Error Responses
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              These top-level errors are returned when the request itself is invalid (missing auth,
              oversized batch). Per-event errors are returned inline in the results array with{" "}
              <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">
                {"{ ok: false, error }"}
              </code>
              .
            </p>
            <div className="space-y-4">
              <CodeBlock
                title="401 Unauthorized - Missing API key"
                language="json"
                code={`{
  "error": "X-API-Key header is required."
}`}
              />
              <CodeBlock
                title="400 Bad Request - Batch too large"
                language="json"
                code={`{
  "error": "Batch size cannot exceed 100 events."
}`}
              />
            </div>
          </section>

          {/* Notifications */}
          <section id="notifications">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Notifications
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg leading-relaxed">
              Beaver can send email notifications when an event is posted with{" "}
              <code className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                "notify": true
              </code>
              . Emails are sent only to project members who have opted in via their notification
              settings.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-6 mb-6">
              <p className="text-blue-800 dark:text-blue-300 font-semibold mb-3">Setup</p>
              <ol className="text-blue-700 dark:text-blue-400 text-sm space-y-2 list-decimal list-inside">
                <li>
                  Sign up at <span className="font-mono">resend.com</span> and create an API key
                </li>
                <li>
                  Set{" "}
                  <code className="bg-white/60 dark:bg-white/10 px-1 rounded">RESEND_API_KEY</code>{" "}
                  in your environment
                </li>
                <li>
                  Optionally set{" "}
                  <code className="bg-white/60 dark:bg-white/10 px-1 rounded">
                    RESEND_FROM_EMAIL
                  </code>{" "}
                  (defaults to{" "}
                  <code className="bg-white/60 dark:bg-white/10 px-1 rounded">
                    notifications@beaver.app
                  </code>
                  )
                </li>
                <li>
                  Project members add an email and enable notifications in{" "}
                  <a
                    href="settings"
                    className="underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-200"
                  >
                    Settings → Notifications
                  </a>
                </li>
              </ol>
            </div>
            <CodeBlock
              title="Triggering a notification"
              language="bash"
              code={`curl -X POST ${baseUrl}/api/event \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayKey}" \\
  -d '{
    "name": "deploy.failed",
    "title": "Production deploy failed on step 3",
    "channel": "alerts",
    "description": "Production deploy failed on step 3",
    "icon": "🚨",
    "notify": true
  }'`}
            />
          </section>

          {/* Tags */}
          <section id="tags">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Tags
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg leading-relaxed">
              Tags are arbitrary key-value pairs that attach structured metadata to an event. They
              power filtering in the dashboard — numeric comparisons, boolean toggles, and string
              lookups all depend on the stored type.
            </p>

            <h3
              id="tag-type-inference"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Type Inference
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The API infers each tag's type from the JSON value you send. No type annotation is
              required.
            </p>
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 mb-6">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      JSON value
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Stored type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Filter UI
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">
                        "premium"
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      Dropdown (≤ 20 distinct values) or free-text input
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">
                        99.99
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">number</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      Numeric input with operator (=, &gt;, &lt;, between)
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">
                        true
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">boolean</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      true / false dropdown
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <CodeBlock
              language="json"
              title="Example — mixed tag types"
              code={`{
  "name": "Purchase",
  "channel": "sales",
  "tags": {
    "plan":     "premium",   // string
    "amount":   99.99,       // number
    "verified": true         // boolean
  }
}`}
            />

            <h3
              id="tag-type-consistency"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-4"
            >
              Type Consistency
            </h3>
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5 mb-4">
              <p className="text-amber-800 dark:text-amber-300 font-semibold mb-1">
                Keep tag types consistent across events
              </p>
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                A tag key's type should be the same on every event. If{" "}
                <code className="bg-amber-100 dark:bg-white/10 px-1 rounded">amount</code> is a
                number on one event and a string on another, the filter UI will use the type it sees
                first. Numeric filters use{" "}
                <code className="bg-amber-100 dark:bg-white/10 px-1 rounded">
                  CAST(value AS REAL)
                </code>{" "}
                internally — rows with a non-numeric value for that key will silently not match
                rather than returning an error.
              </p>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Type mismatches are treated as a caller error. Design your tag schema upfront and send
              values of the same JSON type for a given key on every event.
            </p>
          </section>

          {/* Metrics */}
          <section id="metrics">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Metrics
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg leading-relaxed">
              Log numeric measurements to metrics you've defined in the dashboard. Three types are
              supported: <strong>gauge</strong> (a single current value), <strong>counter</strong>{" "}
              (an incrementing total), and <strong>timeseries</strong> (a time-stamped series of
              values).
            </p>

            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5 mb-8">
              <p className="text-amber-800 dark:text-amber-300 font-semibold mb-1">
                Create metrics in the dashboard first
              </p>
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                The API will return a{" "}
                <code className="bg-amber-100 dark:bg-white/10 px-1 rounded">404</code> if the
                metric name does not exist in the project. Go to{" "}
                <a
                  href="metrics"
                  className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
                >
                  Metrics → Settings
                </a>{" "}
                to create a metric before logging to it.
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl mb-8">
              <MethodBadge method="POST" />
              <code className="text-gray-100 font-mono text-lg">/api/metric</code>
            </div>

            {/* Gauge */}
            <h3
              id="metrics-gauge"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Gauge
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sets the current value of a gauge metric. Each call overwrites the previous value.
            </p>
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 mb-6">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Field
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Required
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        metric
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      The name of the metric as defined in the dashboard
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        value
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">number</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      The current value to set
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-4 mb-10">
              <CodeBlock
                title="cURL — set gauge"
                language="bash"
                code={`curl -X POST ${baseUrl}/api/metric \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayKey}" \\
  -d '{ "metric": "disk_usage", "value": 42.3 }'`}
              />
              <CodeBlock
                title="200 OK"
                language="json"
                code={`{ "ok": true, "metric": "disk_usage", "value": 42.3 }`}
              />
            </div>

            {/* Counter */}
            <h3
              id="metrics-counter"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Counter
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Adds an amount to a counter metric. Use a negative{" "}
              <code className="bg-gray-100 dark:bg-white/10 px-1 rounded text-pink-600 dark:text-pink-400">
                increment
              </code>{" "}
              to subtract. The response includes the new running total.
            </p>
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 mb-6">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Field
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Required
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        metric
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      The name of the metric as defined in the dashboard
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        increment
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">number</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      Amount to add (use a negative number to subtract)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-4 mb-10">
              <CodeBlock
                title="cURL — increment counter"
                language="bash"
                code={`curl -X POST ${baseUrl}/api/metric \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayKey}" \\
  -d '{ "metric": "signups", "increment": 1 }'`}
              />
              <CodeBlock
                title="cURL — decrement counter"
                language="bash"
                code={`curl -X POST ${baseUrl}/api/metric \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayKey}" \\
  -d '{ "metric": "signups", "increment": -1 }'`}
              />
              <CodeBlock
                title="200 OK"
                language="json"
                code={`{ "ok": true, "metric": "signups", "total": 42 }`}
              />
            </div>

            {/* Timeseries */}
            <h3
              id="metrics-timeseries"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Timeseries
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Appends a data point to a timeseries metric. If{" "}
              <code className="bg-gray-100 dark:bg-white/10 px-1 rounded text-pink-600 dark:text-pink-400">
                timestamp
              </code>{" "}
              is omitted, the server records the current time.
            </p>
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 mb-6">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Field
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Required
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        metric
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      The name of the metric as defined in the dashboard
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        value
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">number</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      The numeric measurement to record
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-pink-600 dark:text-pink-400">
                        timestamp
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                    <td className="px-4 py-3">
                      <Badge>Optional</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      ISO 8601 timestamp for the data point. Defaults to now.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-4 mb-2">
              <CodeBlock
                title="cURL — append data point"
                language="bash"
                code={`curl -X POST ${baseUrl}/api/metric \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayKey}" \\
  -d '{ "metric": "response_time", "value": 123.4 }'`}
              />
              <CodeBlock
                title="cURL — with explicit timestamp"
                language="bash"
                code={`curl -X POST ${baseUrl}/api/metric \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayKey}" \\
  -d '{
    "metric": "response_time",
    "value": 98.7,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }'`}
              />
              <CodeBlock
                title="200 OK"
                language="json"
                code={`{
  "ok": true,
  "metric": "response_time",
  "value": 123.4,
  "timestamp": "2024-01-15T10:30:00.000Z"
}`}
              />
            </div>
          </section>

          {/* Code Examples */}
          <section id="code-examples">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Code Examples
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
              Copy and paste these examples into your project to get started quickly.
            </p>

            <div className="space-y-8">
              <div id="javascript">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-900">
                    JS
                  </span>
                  JavaScript / Node.js
                </h3>
                <div className="space-y-4">
                  <CodeBlock
                    title="sendEvent.js"
                    language="javascript"
                    code={`const API_KEY = '${displayKey}';

// Send one event or an array of events — always returns an array of results.
async function sendEvent(events) {
  const response = await fetch('${baseUrl}/api/event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(events),
  });

  return response.json();
}

// Single event
await sendEvent({
  name: 'payment.completed',
  title: 'Customer paid $99.99',
  channel: 'payments',
  icon: '💰',
  tags: { amount: 99.99, currency: 'USD' }
});

// Batch
await sendEvent([
  { name: 'user.signed_up',      title: 'Alice registered',    channel: 'signups' },
  { name: 'payment.completed',   title: 'Alice paid $99.99',   channel: 'payments' },
]);`}
                  />
                </div>
              </div>

              <div id="python">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                    PY
                  </span>
                  Python
                </h3>
                <CodeBlock
                  title="send_event.py"
                  language="python"
                  code={`import requests

API_KEY = '${displayKey}'

def send_event(name, title, channel, description=None, icon=None, tags=None):
    response = requests.post(
        '${baseUrl}/api/event',
        headers={'X-API-Key': API_KEY},
        json={
            'name': name,
            'title': title,
            'channel': channel,
            'description': description,
            'icon': icon,
            'tags': tags,
        }
    )
    return response.json()

# Usage
send_event(
    name='deploy.completed',
    title='v2.1.0 deployed to production',
    channel='deployments',
    description='v2.1.0 deployed to production',
    icon='🚀',
    tags={'version': '2.1.0', 'environment': 'production'}
)`}
                />
              </div>

              <div id="go">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                    GO
                  </span>
                  Go
                </h3>
                <CodeBlock
                  title="event.go"
                  language="go"
                  code={`package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

const apiKey = "${displayKey}"

type Event struct {
    Name        string            \`json:"name"\`
    Title       string            \`json:"title"\`
    Channel     string            \`json:"channel"\`
    Description string            \`json:"description,omitempty"\`
    Icon        string            \`json:"icon,omitempty"\`
    Tags        map[string]string \`json:"tags,omitempty"\`
}

func sendEvent(event Event) error {
    data, err := json.Marshal(event)
    if err != nil {
        return err
    }

    req, err := http.NewRequest("POST", "${baseUrl}/api/event", bytes.NewBuffer(data))
    if err != nil {
        return err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-API-Key", apiKey)

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return nil
}

// Usage
func main() {
    sendEvent(Event{
        Name:        "server.started",
        Title:       "Application server initialized",
        Channel:     "server-events",
        Description: "Application server initialized",
        Icon:        "✅",
        Tags:        map[string]string{"port": "8080"},
    })
}`}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
