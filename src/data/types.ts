export type ClusterId = 'core' | 'experience' | 'projects' | 'skills' | 'education';

export type SectionId =
  | 'top'
  | 'proof'
  | 'experience'
  | 'projects'
  | 'agents'
  | 'skills'
  | 'education'
  | 'contact';

export type SkillLevel = 'Limited' | 'Professional' | 'Full' | 'Native';

export interface Link {
  label: string;
  href: string;
}

export interface Metric {
  value: number;
  suffix: string;
  unit: string;
  detail: string;
}

export interface Highlight {
  title: string;
  body: string;
  tags: string[];
}

export interface Role {
  company: string;
  title: string;
  period: string;
  location: string;
  summary: string;
  highlights: Highlight[];
}

export interface Capability {
  verb: string;
  detail: string;
}

export interface Project {
  id: string;
  name: string;
  kind: string;
  period: string;
  summary: string;
  points: string[];
  stack: string[];
  links: Link[];
}

export interface AgentPractice {
  mode: string;
  title: string;
  body: string;
  facts: string[];
}

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface SkillGroup {
  name: string;
  skills: Skill[];
}

export interface Award {
  title: string;
  detail: string;
}

export interface GraphNode {
  id: string;
  label: string;
  cluster: ClusterId;
  /** The hub sits at the centre of its cluster; every other node orbits it. */
  hub?: boolean;
  /** Section the page scrolls to when the node is clicked. */
  section: SectionId;
}

export interface GraphEdge {
  from: string;
  to: string;
}
