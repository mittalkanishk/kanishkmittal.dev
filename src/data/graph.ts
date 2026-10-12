import type { ClusterId, GraphEdge, GraphNode } from './types';

/**
 * The knowledge graph drawn behind the page. Every node is something on the
 * page, and every cross-cluster edge is a relationship the page states.
 */
export const GRAPH_NODES: GraphNode[] = [
  { id: 'me', label: 'Kanishk Mittal', cluster: 'core', hub: true, section: 'top' },

  { id: 'dailypay', label: 'DailyPay Ireland', cluster: 'experience', hub: true, section: 'experience' },
  { id: 'email-pipeline', label: 'Email engagement pipeline', cluster: 'experience', section: 'experience' },
  { id: 'marketing-pipeline', label: 'Marketing event pipeline', cluster: 'experience', section: 'experience' },
  { id: 'race-fix', label: 'Race-condition fix', cluster: 'experience', section: 'experience' },
  { id: 'lint-bot', label: 'CI lint bot', cluster: 'experience', section: 'experience' },
  { id: 'on-call', label: 'On-call', cluster: 'experience', section: 'experience' },
  { id: 'agent-review', label: 'Agent-assisted review', cluster: 'experience', section: 'agents' },
  { id: 'ledger', label: 'Double-entry ledger', cluster: 'experience', section: 'experience' },

  { id: 'projects', label: 'Projects', cluster: 'projects', hub: true, section: 'projects' },
  { id: 'steerloop', label: 'steerloop', cluster: 'projects', section: 'projects' },
  { id: 'patent-kg', label: 'Patent knowledge graph', cluster: 'projects', section: 'projects' },
  { id: 'collab-editor', label: 'Collaborative editor', cluster: 'projects', section: 'projects' },
  { id: 'leader-election', label: 'Leader election', cluster: 'projects', section: 'projects' },

  { id: 'stack', label: 'Stack', cluster: 'skills', hub: true, section: 'skills' },
  { id: 'go', label: 'Go', cluster: 'skills', section: 'skills' },
  { id: 'typescript', label: 'TypeScript', cluster: 'skills', section: 'skills' },
  { id: 'sql', label: 'SQL', cluster: 'skills', section: 'skills' },
  { id: 'grpc', label: 'gRPC', cluster: 'skills', section: 'skills' },
  { id: 'kafka', label: 'Kafka', cluster: 'skills', section: 'skills' },
  { id: 'postgres', label: 'PostgreSQL', cluster: 'skills', section: 'skills' },
  { id: 'mongodb', label: 'MongoDB', cluster: 'skills', section: 'skills' },
  { id: 'neo4j', label: 'Neo4j', cluster: 'skills', section: 'skills' },
  { id: 'docker', label: 'Docker', cluster: 'skills', section: 'skills' },
  { id: 'terraform', label: 'Terraform', cluster: 'skills', section: 'skills' },
  { id: 'aws', label: 'AWS', cluster: 'skills', section: 'skills' },
  { id: 'gha', label: 'GitHub Actions', cluster: 'skills', section: 'skills' },
  { id: 'datadog', label: 'Datadog', cluster: 'skills', section: 'skills' },
  { id: 'python', label: 'Python', cluster: 'skills', section: 'projects' },
  { id: 'llms', label: 'LLMs', cluster: 'skills', section: 'agents' },
  { id: 'amplitude', label: 'Amplitude', cluster: 'skills', section: 'skills' },
  { id: 'iterable', label: 'Iterable', cluster: 'skills', section: 'skills' },

  { id: 'brunel', label: 'Brunel University London', cluster: 'education', hub: true, section: 'education' },
  { id: 'beng', label: 'B.Eng, First Class', cluster: 'education', section: 'education' },
  { id: 'hawke', label: 'Graham Hawke Award', cluster: 'education', section: 'education' },
  { id: 'hackathon', label: 'Hackathon win', cluster: 'education', section: 'education' },
];

/** Relationships that cross clusters, or tie a hub to the centre. */
const CROSS_EDGES: GraphEdge[] = [
  { from: 'me', to: 'dailypay' },
  { from: 'me', to: 'projects' },
  { from: 'me', to: 'stack' },
  { from: 'me', to: 'brunel' },

  { from: 'dailypay', to: 'typescript' },
  { from: 'dailypay', to: 'grpc' },
  { from: 'dailypay', to: 'terraform' },
  { from: 'race-fix', to: 'go' },
  { from: 'ledger', to: 'go' },
  { from: 'lint-bot', to: 'go' },
  { from: 'email-pipeline', to: 'amplitude' },
  { from: 'marketing-pipeline', to: 'aws' },
  { from: 'marketing-pipeline', to: 'iterable' },
  { from: 'agent-review', to: 'llms' },
  { from: 'hackathon', to: 'dailypay' },

  { from: 'steerloop', to: 'go' },
  { from: 'steerloop', to: 'llms' },
  { from: 'steerloop', to: 'gha' },
  { from: 'patent-kg', to: 'neo4j' },
  { from: 'patent-kg', to: 'python' },
  { from: 'patent-kg', to: 'llms' },
  { from: 'patent-kg', to: 'hawke' },
  { from: 'patent-kg', to: 'brunel' },
  { from: 'collab-editor', to: 'go' },
  { from: 'collab-editor', to: 'grpc' },
  { from: 'collab-editor', to: 'docker' },
  { from: 'leader-election', to: 'python' },
];

function hubOf(cluster: ClusterId): GraphNode {
  const hub = GRAPH_NODES.find((node) => node.cluster === cluster && node.hub);
  if (!hub) throw new Error(`cluster ${cluster} has no hub`);
  return hub;
}

/** Each non-hub node hangs off the hub of its own cluster. */
const SPOKE_EDGES: GraphEdge[] = GRAPH_NODES.filter((node) => !node.hub).map((node) => ({
  from: hubOf(node.cluster).id,
  to: node.id,
}));

export const GRAPH_EDGES: GraphEdge[] = [...SPOKE_EDGES, ...CROSS_EDGES];
