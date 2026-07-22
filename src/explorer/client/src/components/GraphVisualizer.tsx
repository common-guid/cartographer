import React, { useEffect, useMemo } from 'react';
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { useStore } from '../store';
import '@react-sigma/core/lib/style.css';

// A component to load the graph data into Sigma.js and apply layout
const GraphLoader: React.FC = () => {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();
  const { graphType, graphsData, selectedNodeId, showBoilerplate } = useStore();

  const graph = useMemo(() => {
    const g = new Graph();
    if (!graphsData) return g;

    if (graphType === 'module') {
      const { files, entryPoint } = graphsData.moduleGraph;
      const fileKeys = Object.keys(files);

      // Add nodes
      fileKeys.forEach((filePath, index) => {
        const file = files[filePath];
        const angle = (index / fileKeys.length) * 2 * Math.PI;
        const isEntry = entryPoint === filePath;

        g.addNode(filePath, {
          label: filePath,
          x: Math.cos(angle) * 10,
          y: Math.sin(angle) * 10,
          size: isEntry ? 15 : 10 + (file.exports?.length || 0) * 2,
          color: isEntry ? '#c084fc' : '#0ea5e9', // Purple for entry, blue for normal
        });
      });

      // Add edges (imports)
      fileKeys.forEach((filePath) => {
        const file = files[filePath];
        file.imports.forEach((imp) => {
          if (g.hasNode(imp) && !g.hasEdge(filePath, imp)) {
            g.addEdge(filePath, imp, {
              type: 'arrow',
              size: 2,
              color: 'rgba(255, 255, 255, 0.25)',
            });
          }
        });
      });

    } else if (graphType === 'call') {
      const { nodes, edges } = graphsData.callGraph;
      const nodeKeys = Object.keys(nodes);

      // Register all nodes (internal and external)
      const registeredNodes = new Set<string>();
      const bridgeNodeId = 'BRIDGE:BOILERPLATE';
      let addedBridgeNode = false;

      nodeKeys.forEach((nodeId, index) => {
        const node = nodes[nodeId];
        const angle = (index / nodeKeys.length) * 2 * Math.PI;

        if (!showBoilerplate && node.isBoilerplate) {
          if (!addedBridgeNode) {
            g.addNode(bridgeNodeId, {
              label: 'Framework / Boilerplate',
              x: 0,
              y: 0,
              size: 14,
              color: '#64748b', // Slate gray
            });
            registeredNodes.add(bridgeNodeId);
            addedBridgeNode = true;
          }
          return;
        }
        
        g.addNode(nodeId, {
          label: node.name,
          x: Math.cos(angle) * 15,
          y: Math.sin(angle) * 15,
          size: 8,
          color: '#34d399', // Green for internal function
        });
        registeredNodes.add(nodeId);
      });

      // Add call edges and external/bridge nodes
      edges.forEach((edge) => {
        let fromId = edge.from;
        let toId = edge.to;
        let isBridgeEdge = false;

        if (!showBoilerplate) {
          if (nodes[edge.from]?.isBoilerplate) {
            fromId = bridgeNodeId;
            isBridgeEdge = true;
          }
          if (nodes[edge.to]?.isBoilerplate) {
            toId = bridgeNodeId;
            isBridgeEdge = true;
          }
        }

        if (!registeredNodes.has(fromId)) {
          g.addNode(fromId, {
            label: fromId.replace('external:', ''),
            x: Math.random() * 20 - 10,
            y: Math.random() * 20 - 10,
            size: 6,
            color: '#f87171', // Red for external caller/callee
          });
          registeredNodes.add(fromId);
        }
        if (!registeredNodes.has(toId)) {
          g.addNode(toId, {
            label: toId.replace('external:', ''),
            x: Math.random() * 20 - 10,
            y: Math.random() * 20 - 10,
            size: 6,
            color: '#f87171', // Red for external caller/callee
          });
          registeredNodes.add(toId);
        }

        if (g.hasNode(fromId) && g.hasNode(toId) && fromId !== toId && !g.hasEdge(fromId, toId)) {
          g.addEdge(fromId, toId, {
            type: 'arrow',
            size: isBridgeEdge ? 1 : 1.5,
            color: isBridgeEdge ? 'rgba(100, 116, 139, 0.25)' : (edge.type === 'external' ? 'rgba(248, 113, 113, 0.3)' : 'rgba(52, 211, 153, 0.3)'),
          });
        }
      });
    }

    // Apply layout if there are nodes
    if (g.order > 0) {
      try {
        // Run ForceAtlas2 layout synchronously for a few iterations
        forceAtlas2(g, {
          iterations: 80,
          settings: {
            gravity: 1,
            scalingRatio: 2.0,
            barnesHutOptimize: g.order > 100,
          },
        });
      } catch (err) {
        console.error('Layout failed, using default coordinates', err);
      }
    }

    return g;
  }, [graphsData, graphType]);

  useEffect(() => {
    loadGraph(graph);
  }, [loadGraph, graph]);

  // Handle selected node highlighting
  useEffect(() => {
    if (!sigma || !graphsData) return;

    sigma.getGraph().forEachNode((node) => {
      let originalColor = '#0ea5e9';
      if (graphType === 'module') {
        const { entryPoint } = graphsData.moduleGraph;
        originalColor = entryPoint === node ? '#c084fc' : '#0ea5e9';
      } else {
        if (node === 'BRIDGE:BOILERPLATE') {
          originalColor = '#64748b';
        } else {
          const isExternal = node.startsWith('external:') || !graphsData.callGraph.nodes[node];
          originalColor = isExternal ? '#f87171' : '#34d399';
        }
      }

      let isHighlighted = true;
      if (selectedNodeId) {
        if (node === selectedNodeId) {
          isHighlighted = true;
        } else {
          const neighbors = sigma.getGraph().neighbors(selectedNodeId);
          isHighlighted = neighbors.includes(node);
        }
      }

      sigma.getGraph().setNodeAttribute(
        node, 
        'color', 
        selectedNodeId 
          ? (isHighlighted ? originalColor : 'rgba(100, 116, 139, 0.15)')
          : originalColor
      );
    });

    sigma.refresh();
  }, [sigma, selectedNodeId, graph, graphType, graphsData]);

  return null;
};

// Component to handle mouse interactions and register click handlers
const EventBinder: React.FC = () => {
  const registerEvents = useRegisterEvents();
  const selectNode = useStore((state) => state.selectNode);

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        selectNode(event.node);
      },
      clickStage: () => {
        selectNode(null);
      },
    });
  }, [registerEvents, selectNode]);

  return null;
};

export const GraphVisualizer: React.FC = () => {
  const { graphsData } = useStore();

  if (!graphsData) {
    return (
      <div className="no-selection">
        <div className="no-selection-icon">🌐</div>
        <p>Loading network graph visualization...</p>
      </div>
    );
  }

  const containerSettings = {
    allowOuterEdgeEvents: true,
    defaultNodeColor: '#38bdf8',
    defaultEdgeColor: 'rgba(255, 255, 255, 0.15)',
    labelColor: { color: '#f3f4f6' },
    labelSize: 11,
    labelFont: 'Outfit, sans-serif',
  };

  return (
    <div className="graph-container" id="graph-visualizer-canvas">
      <SigmaContainer style={{ width: '100%', height: '100%' }} settings={containerSettings}>
        <GraphLoader />
        <EventBinder />
      </SigmaContainer>
    </div>
  );
};
