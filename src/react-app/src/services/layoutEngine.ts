import { MindmapNode } from '../store/mindmapStore';

export interface Position {
  x: number;
  y: number;
}

export interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  direction?: 'down' | 'right'; // For tree layout
}

interface NodeWithParent extends MindmapNode {
  children?: MindmapNode[];
  depth?: number;
}

/**
 * Hierarchical Tree Layout Algorithm
 * Arranges nodes in a tree structure with depth-based positioning
 */
export function treeLayout(
  nodes: MindmapNode[],
  config: LayoutConfig = {
    horizontalSpacing: 200,
    verticalSpacing: 120,
  }
): Record<string, Position> {
  const positions: Record<string, Position> = {};

  // Build tree structure
  const nodeMap = new Map<string, NodeWithParent>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Link children to parents
  const roots: NodeWithParent[] = [];
  nodeMap.forEach((node) => {
    if (node.parentId === 'root' || !node.parentId) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  });

  // Calculate positions using depth-first traversal
  const visited = new Set<string>();

  function layoutNode(
    node: NodeWithParent,
    x: number,
    y: number,
    depth: number
  ): number {
    if (visited.has(node.id)) return y;
    visited.add(node.id);

    positions[node.id] = { x, y };
    node.depth = depth;

    let currentY = y + config.verticalSpacing;

    // Layout children
    if (node.children && node.children.length > 0) {
      const childWidth = config.horizontalSpacing;
      const totalChildWidth = (node.children.length - 1) * childWidth;
      const startX = x - totalChildWidth / 2;

      node.children.forEach((child, index) => {
        const childX = startX + index * childWidth;
        currentY = layoutNode(child as NodeWithParent, childX, currentY, depth + 1);
      });
    }

    return currentY;
  }

  // Layout roots
  let currentY = 0;
  roots.forEach((root) => {
    currentY = layoutNode(root, 0, currentY, 0);
    currentY += config.verticalSpacing;
  });

  return positions;
}

/**
 * Radial Layout Algorithm
 * Arranges nodes in concentric circles based on depth
 */
export function radialLayout(
  nodes: MindmapNode[],
  config: LayoutConfig = {
    horizontalSpacing: 150,
    verticalSpacing: 150,
  }
): Record<string, Position> {
  const positions: Record<string, Position> = {};

  // Build tree structure
  const nodeMap = new Map<string, NodeWithParent>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Link children to parents
  nodeMap.forEach((node) => {
    if (node.parentId && node.parentId !== 'root') {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  });

  // Calculate depth for each node
  const depths = new Map<string, number>();

  function calculateDepth(nodeId: string, depth: number = 0): number {
    if (depths.has(nodeId)) return depths.get(nodeId)!;
    depths.set(nodeId, depth);

    const node = nodeMap.get(nodeId);
    if (node && node.children) {
      node.children.forEach((child) => {
        calculateDepth(child.id, depth + 1);
      });
    }

    return depth;
  }

  // Find root nodes
  const roots: MindmapNode[] = [];
  nodes.forEach((node) => {
    if (!node.parentId || node.parentId === 'root') {
      roots.push(node);
      calculateDepth(node.id, 0);
    }
  });

  // Arrange nodes in circles
  const depthGroups = new Map<number, string[]>();
  depths.forEach((depth, nodeId) => {
    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth)!.push(nodeId);
  });

  // Position root at center
  if (roots.length > 0) {
    positions[roots[0].id] = { x: 0, y: 0 };
  }

  // Position children in circles
  depthGroups.forEach((nodeIds, depth) => {
    if (depth === 0) return;

    const radius = depth * config.horizontalSpacing;
    const count = nodeIds.length;
    const angleStep = (2 * Math.PI) / count;

    nodeIds.forEach((nodeId, index) => {
      const angle = index * angleStep;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      positions[nodeId] = { x, y };
    });
  });

  return positions;
}

/**
 * Organic Force-Directed Layout (simplified)
 * Arranges nodes to minimize overlaps and create balanced layout
 */
export function organicLayout(
  nodes: MindmapNode[],
  config: LayoutConfig = {
    horizontalSpacing: 180,
    verticalSpacing: 140,
  }
): Record<string, Position> {
  // Start with tree layout as base
  const positions = treeLayout(nodes, config);

  // Apply simple force-directed adjustments
  const iterations = 3;
  const repulsionStrength = 50;
  const minDistance = 100;

  for (let iter = 0; iter < iterations; iter++) {
    const adjustments: Record<string, { x: number; y: number }> = {};

    // Initialize adjustments
    nodes.forEach((node) => {
      adjustments[node.id] = { x: 0, y: 0 };
    });

    // Calculate repulsive forces
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        const pos1 = positions[node1.id];
        const pos2 = positions[node2.id];

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        if (distance < minDistance) {
          const force = repulsionStrength / distance;
          const fx = (force * dx) / distance;
          const fy = (force * dy) / distance;

          adjustments[node1.id].x -= fx * 0.1;
          adjustments[node1.id].y -= fy * 0.1;
          adjustments[node2.id].x += fx * 0.1;
          adjustments[node2.id].y += fy * 0.1;
        }
      }
    }

    // Apply adjustments with damping
    nodes.forEach((node) => {
      positions[node.id].x += adjustments[node.id].x * 0.5;
      positions[node.id].y += adjustments[node.id].y * 0.5;
    });
  }

  return positions;
}

/**
 * Main layout function that applies layout to all nodes
 */
export function applyLayout(
  nodes: MindmapNode[],
  layoutType: 'tree' | 'radial' | 'organic' = 'tree',
  config?: LayoutConfig
): MindmapNode[] {
  let positions: Record<string, Position>;

  switch (layoutType) {
    case 'radial':
      positions = radialLayout(nodes, config);
      break;
    case 'organic':
      positions = organicLayout(nodes, config);
      break;
    case 'tree':
    default:
      positions = treeLayout(nodes, config);
  }

  // Update nodes with new positions
  return nodes.map((node) => ({
    ...node,
    position: positions[node.id] || node.position,
  }));
}
