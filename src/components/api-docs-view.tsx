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
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {language}
          </span>
        </div>
      )}
      <Highlight
        theme={themes.nightOwl}
        code={code.trim()}
        language={prismLanguage}
      >
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
    default: "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
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
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const sections = [
    { id: "overview", title: "Overview" },
    { id: "authentication", title: "Authentication" },
    {
      id: "create-event",
      title: "Create Event",
      children: [
        { id: "request-body", title: "Request Body" },
        { id: "example-request", title: "Example Request" },
        { id: "success-response", title: "Success Response" },
        { id: "error-responses", title: "Error Responses" },
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
      <div className="p-8 border-b">
        <h1 className="text-2xl font-semibold">API Documentation</h1>
      </div>

      <div className="w-full flex flex-col items-center mt-8 pb-16">
        <div className="w-3/4 space-y-12">
          {/* Table of Contents */}
          <nav className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Table of Contents
            </h2>
            <ul className="space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-gray-600 hover:text-gray-900 hover:underline transition-colors"
                  >
                    {section.title}
                  </a>
                  {section.children && (
                    <ul className="ml-4 mt-2 space-y-1">
                      {section.children.map((child) => (
                        <li key={child.id}>
                          <a
                            href={`#${child.id}`}
                            className="text-gray-500 hover:text-gray-700 hover:underline transition-colors text-sm"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Overview
            </h2>
            <p className="text-gray-600 mb-6 text-lg leading-relaxed">
              The Beaver API allows you to send events from your applications to
              track important activities. Events are organized by channels
              within your project.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 font-semibold">Base URL</span>
              </div>
              <code className="text-lg font-mono text-blue-900 bg-white/60 px-3 py-1.5 rounded-lg">
                {baseUrl}/api
              </code>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Authentication
            </h2>
            <p className="text-gray-600 mb-6 text-lg leading-relaxed">
              All event submissions require an API key. You can find your
              project's API key in the{" "}
              <a
                href="settings"
                className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
              >
                Settings
              </a>{" "}
              page.
            </p>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-700 font-semibold">
                  Your API Key
                </span>
                <Badge variant="warning">Keep this secret</Badge>
              </div>
              <code className="block font-mono text-amber-900 bg-white/60 px-4 py-3 rounded-lg text-sm break-all">
                {apiKey}
              </code>
            </div>
          </section>

          {/* Create Event Endpoint */}
          <section id="create-event">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Create Event
            </h2>
            <p className="text-gray-600 mb-6 text-lg leading-relaxed">
              Send events to a specific channel in your project.
            </p>

            {/* Endpoint */}
            <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl mb-8">
              <MethodBadge method="POST" />
              <code className="text-gray-100 font-mono text-lg">
                /api/event
              </code>
            </div>

            {/* Request Body */}
            <h3
              id="request-body"
              className="text-lg font-semibold text-gray-900 mb-4"
            >
              Request Body
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-200 mb-8">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Field
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Required
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded text-pink-600">
                        name
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">string</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      The name/title of the event
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded text-pink-600">
                        channel
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">string</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      The channel name to send the event to
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded text-pink-600">
                        apiKey
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">string</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Yes</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      Your project's API key
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded text-pink-600">
                        description
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">string</td>
                    <td className="px-4 py-3">
                      <Badge>Optional</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      Additional details about the event
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded text-pink-600">
                        icon
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">string</td>
                    <td className="px-4 py-3">
                      <Badge>Optional</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      An emoji or icon for the event
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded text-pink-600">
                        tags
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">object</td>
                    <td className="px-4 py-3">
                      <Badge>Optional</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      Key-value pairs for additional metadata
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Example Request */}
            <h3
              id="example-request"
              className="text-lg font-semibold text-gray-900 mb-4"
            >
              Example Request
            </h3>
            <div className="mb-8">
              <CodeBlock
                title="cURL"
                language="bash"
                code={`curl -X POST ${baseUrl}/api/event \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "User Signed Up",
    "channel": "signups",
    "apiKey": "${apiKey}",
    "description": "New user registration",
    "icon": "🎉",
    "tags": {
      "plan": "premium",
      "source": "landing-page"
    }
  }'`}
              />
            </div>

            {/* Success Response */}
            <h3
              id="success-response"
              className="text-lg font-semibold text-gray-900 mb-4"
            >
              Success Response
            </h3>
            <div className="mb-8">
              <CodeBlock
                title="200 OK"
                language="json"
                code={`{
  "id": 123,
  "name": "User Signed Up",
  "description": "New user registration",
  "icon": "🎉",
  "tags": {
    "plan": "premium",
    "source": "landing-page"
  },
  "channelId": 1,
  "createdAt": "2024-01-15T10:30:00.000Z"
}`}
              />
            </div>

            {/* Error Responses */}
            <h3
              id="error-responses"
              className="text-lg font-semibold text-gray-900 mb-4"
            >
              Error Responses
            </h3>
            <div className="space-y-4">
              <CodeBlock
                title="400 Bad Request - Missing required field"
                language="json"
                code={`{
  "error": "name is a required field."
}`}
              />
              <CodeBlock
                title="400 Bad Request - Invalid tags format"
                language="json"
                code={`{
  "error": "tags object is not valid JSON."
}`}
              />
              <CodeBlock
                title="500 Internal Server Error - Invalid API key or channel"
                language="json"
                code={`{
  "error": "Channel not found for the given API key."
}`}
              />
            </div>
          </section>

          {/* Code Examples */}
          <section id="code-examples">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              Code Examples
            </h2>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Copy and paste these examples into your project to get started
              quickly.
            </p>

            <div className="space-y-8">
              <div id="javascript">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-900">
                    JS
                  </span>
                  JavaScript / Node.js
                </h3>
                <CodeBlock
                  title="sendEvent.js"
                  language="javascript"
                  code={`async function sendEvent(eventData) {
  const response = await fetch('${baseUrl}/api/event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: eventData.name,
      channel: eventData.channel,
      apiKey: '${apiKey}',
      description: eventData.description,
      icon: eventData.icon,
      tags: eventData.tags,
    }),
  });

  return response.json();
}

// Usage
await sendEvent({
  name: 'Payment Received',
  channel: 'payments',
  description: 'Customer completed checkout',
  icon: '💰',
  tags: { amount: '99.99', currency: 'USD' }
});`}
                />
              </div>

              <div id="python">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                    PY
                  </span>
                  Python
                </h3>
                <CodeBlock
                  title="send_event.py"
                  language="python"
                  code={`import requests

def send_event(name, channel, description=None, icon=None, tags=None):
    response = requests.post(
        '${baseUrl}/api/event',
        json={
            'name': name,
            'channel': channel,
            'apiKey': '${apiKey}',
            'description': description,
            'icon': icon,
            'tags': tags,
        }
    )
    return response.json()

# Usage
send_event(
    name='Deployment Complete',
    channel='deployments',
    description='v2.1.0 deployed to production',
    icon='🚀',
    tags={'version': '2.1.0', 'environment': 'production'}
)`}
                />
              </div>

              <div id="go">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
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

type Event struct {
    Name        string            \`json:"name"\`
    Channel     string            \`json:"channel"\`
    ApiKey      string            \`json:"apiKey"\`
    Description string            \`json:"description,omitempty"\`
    Icon        string            \`json:"icon,omitempty"\`
    Tags        map[string]string \`json:"tags,omitempty"\`
}

func sendEvent(event Event) error {
    event.ApiKey = "${apiKey}"

    data, err := json.Marshal(event)
    if err != nil {
        return err
    }

    resp, err := http.Post(
        "${baseUrl}/api/event",
        "application/json",
        bytes.NewBuffer(data),
    )
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return nil
}

// Usage
func main() {
    sendEvent(Event{
        Name:        "Server Started",
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
