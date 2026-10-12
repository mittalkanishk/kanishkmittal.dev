import type {
  AgentPractice,
  Award,
  Capability,
  Link,
  Metric,
  Project,
  Role,
  SkillGroup,
} from './types';

export const person = {
  name: 'Kanishk Mittal',
  role: 'Software Engineer',
  location: 'New Delhi, India',
  timezone: 'IST',
  tagline: 'I turn messy data into knowledge graphs and clean APIs.',
  intro:
    'Software engineer focused on event-driven Go and TypeScript systems: pipelines, gRPC services, third-party integrations, and the tooling that keeps them correct in production.',
  status: 'Open to software engineering roles',
  workStyle: 'Remote preferred. On-site or hybrid is fine.',
  availability: 'Available to interview now.',
  motto: 'Learn, Invest, Contribute',
  email: 'kanishkable@gmail.com',
  github: 'https://github.com/mittalkanishk',
  site: 'https://kanishkmittal.dev',
} as const;

export const about: string[] = [
  'I’m a self-driven, business-minded engineer. I take pride in building solutions that fit the problems and not vice versa, and I try to grow as a teammate, a technical leader and an open source contributor.',
  'My recent work is event-driven programming: Go, TypeScript, gRPC, external API integrations, developer tooling for testing, and Kubernetes-centric deployment infrastructure.',
];

export const metrics: Metric[] = [
  {
    value: 30,
    suffix: 'M+',
    unit: 'events a month',
    detail: 'SendGrid webhooks routed into Amplitude through a data-router service.',
  },
  {
    value: 60,
    suffix: '',
    unit: 'concurrent goroutines',
    detail: 'sharing one client when a production race surfaced. Traced it and shipped the fix.',
  },
  {
    value: 500,
    suffix: '+',
    unit: 'review suggestions',
    detail: 'from the CI lint bot I introduced with static analysis and auto-fix.',
  },
  {
    value: 100,
    suffix: '+',
    unit: 'pull requests reviewed',
    detail: 'with Claude Code plugins, across 9 teammates.',
  },
  {
    value: 96,
    suffix: '%',
    unit: 'statement coverage',
    detail: 'on the steerloop library, with race-enabled tests and fuzzing in CI.',
  },
  {
    value: 2,
    suffix: '',
    unit: 'ledger versions',
    detail: 'of a production double-entry ledger in Go that I helped design, build and test.',
  },
];

export const roles: Role[] = [
  {
    company: 'DailyPay',
    title: 'Software Developer I',
    period: 'Jul 2025 – Jul 2026',
    location: 'Belfast, UK',
    summary:
      'Event pipelines for marketing technology, CI tooling, on-call ownership, and agent-assisted review across the team.',
    highlights: [
      {
        title: 'Email engagement pipeline',
        body: 'Built an end-to-end pipeline that routes SendGrid webhooks into Amplitude through a data-router service, so marketing can track opens, clicks and bounces at 30M+ events a month. Demoed the full flow at the company Tech Thursday.',
        tags: ['Webhooks', 'SendGrid', 'Amplitude'],
      },
      {
        title: 'Marketing event pipeline',
        body: 'Shipped an SQS-based pipeline that routes marketing activity events from internal message queues to Iterable. Owned the consumer and the handler across 2 microservices.',
        tags: ['SQS', 'Iterable', 'Microservices'],
      },
      {
        title: 'Race condition in production',
        body: 'Resolved a production service crash by tracing a Go race condition in a shared client used by 60 concurrent goroutines, then shipped a singleton initialization fix.',
        tags: ['Go', 'Concurrency', 'Incident'],
      },
      {
        title: 'CI lint bot',
        body: 'Introduced static analysis linting to CI with an auto-fix bot that has made 500+ code review suggestions and brought linted Go code to the MARTEC service. Removed a deprecated service to shrink the maintenance surface, and added a CLI plugin for standardized communication event triggering.',
        tags: ['Static analysis', 'CI', 'Go'],
      },
      {
        title: 'On-call',
        body: 'Triaged production incidents, contributed to cross-team cutover planning and scheduled maintenance, did root-cause analysis, and shipped remediation from alert to resolution. Solved more than 5 production bugs with a documented investigative approach.',
        tags: ['Incident response', 'Root-cause analysis'],
      },
      {
        title: 'Agent-assisted review and automation',
        body: 'Reviewed 100+ pull requests with Claude Code plugins (Ruflo) across 9 teammates, covering code style, concurrency issues, async API contract mismatches and alerting thresholds. Built a Claude Code automation skill for multi-repo message-type additions.',
        tags: ['Claude Code', 'Code review', 'Automation'],
      },
    ],
  },
  {
    company: 'DailyPay',
    title: 'Software Engineer (Placement)',
    period: 'Sep 2023 – Aug 2024',
    location: 'Belfast, UK',
    summary:
      'A placement year on the ledger, the company’s flagship service, during its move from a Ruby monolith to Go.',
    highlights: [
      {
        title: 'Ledger migration',
        body: 'Took part in migrating the ledger from a Ruby monolith to a modular Go architecture. Helped design, build and test 2 versions of a production double-entry ledger in Go, on a team with data engineers, including ETL pipeline design.',
        tags: ['Go', 'Double-entry ledger', 'ETL'],
      },
      {
        title: 'Ledger v3 worker pipeline',
        body: 'That work led to the Ledger v3 worker pipeline, validating gross-earnings and shift-data endpoints against the live service at scale.',
        tags: ['Workers', 'Data correctness'],
      },
      {
        title: 'Terraform',
        body: 'Hands-on Terraform, from local modules to shared monolith modules. Created a service-separate Terraform environment for metrics cost analysis.',
        tags: ['Terraform', 'Cost analysis'],
      },
      {
        title: 'Lighter primary database',
        body: 'Moved the announcements controller in the Ruby monolith onto a replica reader, which took load off the primary database.',
        tags: ['Ruby', 'Read replica'],
      },
      {
        title: 'Hackathon winner',
        body: 'Led a 3-person team to prototype AR-based customer onboarding. Won £500 and recognition from the then CEO.',
        tags: ['AR', 'Team lead'],
      },
    ],
  },
];

export const steerloop: Project = {
  id: 'steerloop',
  name: 'steerloop',
  kind: 'Open-source Go library and CLI',
  period: 'October 2026',
  summary:
    'A controllable agent loop for Go, built on CloudWeGo Eino. It runs an LLM tool-calling loop that can be stopped, redirected or reconfigured while it is still running.',
  points: [
    'Released as v0.1.1 under Apache-2.0.',
    'CI runs race-enabled tests, fuzzing, staticcheck and govulncheck on two Go versions.',
    '96% statement coverage on the library.',
  ],
  stack: ['Go', 'CloudWeGo Eino', 'Apache-2.0', 'v0.1.1'],
  links: [{ label: 'Source on GitHub', href: 'https://github.com/mittalkanishk/steerloop' }],
};

export const steerloopCapabilities: Capability[] = [
  {
    verb: 'Steer',
    detail: 'Stop a run, inject a user message, or change its iteration cap and temperature mid-flight.',
  },
  {
    verb: 'Watch',
    detail: 'A typed event stream for model turns, tool calls, tool results and the final outcome.',
  },
  {
    verb: 'Pause',
    detail: 'Hand named tool calls to a function that can wait for a human answer.',
  },
  {
    verb: 'Survive',
    detail: 'Retries on transient provider failures, and a watchdog that aborts a stalled stream.',
  },
  {
    verb: 'Audit',
    detail: 'One record per model turn with the request, the reply, token counts and cost.',
  },
];

export const patentGraph: Project = {
  id: 'patent-kg',
  name: 'Patent Knowledge Graph',
  kind: 'Awarded dissertation research',
  period: 'Aug 2024 – Mar 2025 · London, UK',
  summary:
    'An NLP and semantic-search pipeline that maps the relationships between chemical patents. Dissertation: “Knowledge Graph-Augmented LLMs for Chemical Patent Analysis.”',
  points: [
    'Graham Hawke Award for the best final year dissertation in EEE.',
    'Best Final Year Project in the EEE faculty at Brunel University.',
  ],
  stack: ['Python', 'Scrapy', 'Neo4j', 'Vector embeddings', 'LLMs'],
  links: [{ label: 'Watch the demo', href: 'https://www.youtube.com/watch?v=DRHT8MYLaso&t=10s' }],
};

export const patentPipeline: { tool: string; job: string }[] = [
  { tool: 'Scrapy', job: 'Collect patents' },
  { tool: 'NLP', job: 'Extract relationships' },
  { tool: 'Neo4j', job: 'Knowledge graph' },
  { tool: 'Embeddings', job: 'Semantic search' },
  { tool: 'LLM', job: 'Graph-augmented answers' },
];

export const moreProjects: Project[] = [
  {
    id: 'collab-editor',
    name: 'Collaborative text editor',
    kind: 'Realtime editing over gRPC',
    period: '2025',
    summary:
      'Several people edit one document at the same time and see each other’s cursors. Consistency comes from a CRDT: replicated growable arrays implemented as a timestamped insertion tree.',
    points: ['Guarantees eventual consistency.', 'Go backend, gRPC-web frontend, run with Docker Compose.'],
    stack: ['Go', 'gRPC', 'CRDT', 'JavaScript', 'Docker'],
    links: [
      { label: 'Source on GitHub', href: 'https://github.com/mittalkanishk/collaborative-Text-Editor-Grpc' },
    ],
  },
  {
    id: 'leader-election',
    name: 'Leader-election testbench',
    kind: 'Distributed systems study',
    period: '2025',
    summary:
      'Compares the classic Bully and Ring algorithms with a two-candidate ring that keeps a coordinator and a pre-appointed backup, so a failed leader is replaced without a full election.',
    points: [
      'Five scenarios: coordinator failure, node join, small-node failure, node leave and network split.',
      'Measures message overhead and convergence time as the node count grows.',
    ],
    stack: ['Python', 'Jupyter', 'matplotlib'],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/mittalkanishk/DoubleBullyRingLeader' }],
  },
];

export const agentPractices: AgentPractice[] = [
  {
    mode: 'Build',
    title: 'A loop you can interrupt',
    body: 'steerloop gives a Go program control over an agent run that is already in flight: stop it, redirect it, pause it for a person, and keep an audit record of every model turn.',
    facts: ['Typed event stream', 'Human-in-the-loop pauses', 'Per-turn cost audit'],
  },
  {
    mode: 'Operate',
    title: 'Agents inside a real team',
    body: 'At DailyPay I reviewed 100+ pull requests with Claude Code plugins across 9 teammates, including Claude-generated code, and built an automation skill for multi-repo message-type additions.',
    facts: ['100+ PRs reviewed', '9 teammates', 'Progressive-disclosure prompts'],
  },
  {
    mode: 'Research',
    title: 'Grounding models in a graph',
    body: 'My dissertation augmented LLMs with a knowledge graph to analyse chemical patents, combining Neo4j, vector embeddings and semantic search. It won the Graham Hawke Award.',
    facts: ['Neo4j', 'Vector embeddings', 'Award-winning'],
  },
];

export const skillGroups: SkillGroup[] = [
  {
    name: 'Languages',
    skills: [
      { name: 'Go', level: 'Native' },
      { name: 'TypeScript', level: 'Professional' },
      { name: 'SQL', level: 'Professional' },
      { name: 'Bash', level: 'Limited' },
    ],
  },
  {
    name: 'Event-driven',
    skills: [
      { name: 'Microservices', level: 'Full' },
      { name: 'gRPC / Protobuf', level: 'Full' },
      { name: 'Kafka', level: 'Professional' },
      { name: 'On-call', level: 'Professional' },
    ],
  },
  {
    name: 'Databases',
    skills: [
      { name: 'PostgreSQL', level: 'Native' },
      { name: 'MongoDB', level: 'Professional' },
      { name: 'Neo4j knowledge graphs', level: 'Professional' },
    ],
  },
  {
    name: 'Infrastructure',
    skills: [
      { name: 'Docker', level: 'Full' },
      { name: 'GitHub Actions', level: 'Full' },
      { name: 'Datadog', level: 'Full' },
      { name: 'Terraform', level: 'Professional' },
      { name: 'AWS', level: 'Professional' },
    ],
  },
  {
    name: 'Practice',
    skills: [
      { name: 'AI code editing', level: 'Full' },
      { name: 'Event lineage testing', level: 'Professional' },
      { name: 'Amplitude analytics', level: 'Professional' },
      { name: 'RudderStack analytics', level: 'Professional' },
      { name: 'Iterable', level: 'Professional' },
      { name: 'LeetCode 150+', level: 'Professional' },
    ],
  },
];

export const skillFocus = 'Current focus: Kubernetes-centric deployment infrastructure.';

export const education = {
  school: 'Brunel University',
  place: 'London, UK',
  degree: 'B.Eng. Computer Systems Engineering',
  period: 'Sep 2021 – Jun 2025',
  result: 'First Class with Honours',
  dissertation: 'Knowledge Graph-Augmented LLMs for Chemical Patent Analysis',
} as const;

export const awards: Award[] = [
  {
    title: 'Graham Hawke Award',
    detail: 'Best final year dissertation in EEE, Brunel University.',
  },
  {
    title: 'Best Final Year Project',
    detail: 'EEE faculty, Brunel University, for the patent knowledge graph.',
  },
  {
    title: 'Hackathon winner',
    detail: 'Led a 3-person team at DailyPay to prototype AR-based customer onboarding. £500 prize.',
  },
];

export const navLinks: Link[] = [
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Agents', href: '#agents' },
  { label: 'Skills', href: '#skills' },
  { label: 'Education', href: '#education' },
  { label: 'Contact', href: '#contact' },
];
