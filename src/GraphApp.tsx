import * as React from "react"
import {useEffect, useRef, useState} from "react";

import {ToolPanel, Tool, Action} from "./ToolPanel";

class Queue<T> {
    private storage: T[] = [];

    constructor(private capacity: number = Infinity) {}

    push(item: T): void {
        if (this.size() === this.capacity) {
            throw Error("Queue has reached max capacity, you cannot add more items");
        }
        this.storage.push(item);
    }
    pop(): T | undefined {
        return this.storage.shift();
    }
    size(): number {
        return this.storage.length;
    }
}

let graph: Graph = null;

const GraphApp = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [height, setHeight] = useState();
    const [width, setWidth] = useState(0);

    useEffect(() => {
        graph = new Graph(canvasRef.current);

        if(containerRef.current) {
            setWidth(containerRef.current.clientWidth);
            setHeight(containerRef.current.clientHeight);
        }
    }, []);

    return (
        <div id="graph-app">
            <ToolPanel tools={[AddTool, RemoveTool, SetSourceTool, SetTargetTool, RunAction]} graph={graph} />
            <div id="container" ref={containerRef}>
                <canvas
                    ref={canvasRef}
                    id="graph-canvas"
                    width={width}
                    height={height} />
            </div>
        </div>
    );
}
export default GraphApp;


const AddTool = new Tool("add");
const RemoveTool = new Tool("remove");
const SetSourceTool = new Tool("set_source");
const SetTargetTool = new Tool("set_target");
const RunAction = new Action("run", () => graph.runTransferDemo());

class Graph {
    scheme: Map<GraphNode, Set<GraphNode>>;

    nodes: Set<GraphNode>;
    edges: Set<GraphEdge>;

    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null;

    selectedNode: GraphNode | null = null;
    prevHovered: GraphNode | null = null;

    currentTool: Tool = AddTool;

    sourceNode: GraphNode | null = null;
    targetNode: GraphNode | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.scheme = new Map();
        this.nodes = new Set<GraphNode>();
        this.edges = new Set<GraphEdge>();

        this.canvas = canvas;
        this.context = this.canvas.getContext("2d");

        this.bindHandlers();
    }

    bindHandlers() {
        this.canvas.addEventListener("mouseup", this.onClick);
        this.canvas.addEventListener("mousemove", this.onMove);
    }

    setCurrentTool(tool: Tool) {
        this.currentTool = tool;
    }

    distance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt(Math.abs(x1 - x2) ** 2 + Math.abs(y1 - y2) ** 2);
    }

    getCollision(x: number, y: number): GraphObject | null {
        let result = null;
        this.nodes.forEach((node) => {
            if (this.distance(x, y, node.x, node.y) <= node.radius) {
                result = node;
                return;
            }
        });
        if (result !== null) return result;
        this.edges.forEach((edge) => {
            let d1 = this.distance(edge.from.x, edge.from.y, edge.to.x, edge.to.y);
            let d2 = this.distance(edge.from.x, edge.from.y, x, y);
            let d3 = this.distance(edge.to.x, edge.to.y, x, y);
            if (Math.abs(d1 - (d2 + d3)) <= 1) {
                result = edge;
                return;
            }
        });
        return result;
    }

    onMove(event: MouseEvent) {
        const canvas = event.target as HTMLCanvasElement;
        let x = event.pageX - canvas.offsetLeft;
        let y = event.pageY - canvas.offsetTop;
        let hoveredObject = graph.getCollision(x, y);

        if (graph.prevHovered !== null) {
            graph.prevHovered.removeState("hovered");
        }
        if (hoveredObject !== null) {
            hoveredObject.setState("hovered");
            graph.prevHovered = hoveredObject as GraphNode;
        }

        graph.render();
    }

    onClick(event: MouseEvent) {
        const canvas = event.target as HTMLCanvasElement;
        let x = event.pageX - canvas.offsetLeft;
        let y = event.pageY - canvas.offsetTop;
        let clickedObject = graph.getCollision(x, y);

        switch (graph.currentTool) {
            case AddTool: {
                if (clickedObject === null) {
                    graph.addNode(new GraphNode(x, y));
                } else {
                    if (clickedObject instanceof GraphNode) {
                        if (graph.selectedNode === null) {
                            clickedObject.setState("selected");
                            graph.selectedNode = clickedObject;
                        } else {
                            graph.addEdge(new GraphEdge(graph.selectedNode, clickedObject));
                            graph.selectedNode.removeState("selected");
                            graph.selectedNode = null;
                        }
                    }
                }
                break;
            }
            case RemoveTool: {
                if (clickedObject !== null) {
                    if (clickedObject instanceof GraphNode) {
                        graph.removeNode(clickedObject);
                    }
                    if (clickedObject instanceof GraphEdge) {
                        graph.removeEdge(clickedObject);
                    }
                }
                break;
            }
            case SetTargetTool: {
                if (clickedObject !== null && clickedObject instanceof GraphNode) {
                    if (graph.sourceNode === clickedObject) {
                        graph.sourceNode.removeState("source");
                        graph.sourceNode = null;
                    }
                    if (graph.targetNode !== null) {
                        graph.targetNode.removeState("target");
                    }
                    if (graph.targetNode === clickedObject) {
                        graph.targetNode = null;
                    } else {
                        graph.targetNode = clickedObject;
                        clickedObject.setState("target");
                    }
                }
                break;
            }
            case SetSourceTool: {
                if (clickedObject !== null && clickedObject instanceof GraphNode) {
                    if (graph.targetNode === clickedObject) {
                        graph.targetNode.removeState("target");
                        graph.targetNode = null;
                    }
                    if (graph.sourceNode !== null) {
                        graph.sourceNode.removeState("source");
                    }
                    if (graph.sourceNode === clickedObject) {
                        graph.sourceNode = null;
                    } else {
                        graph.sourceNode = clickedObject;
                        clickedObject.setState("source");
                    }
                }
                break;
            }
        }

        graph.render();
    }

    addNode(node: GraphNode) {
        this.scheme.set(node, new Set());
        this.nodes.add(node);
    }
    
    removeNode(node: GraphNode) {
        this.scheme.get(node).forEach((neighbour) => {
            this.scheme.get(neighbour).delete(node);
        })
        this.scheme.delete(node)
        this.nodes.delete(node);
    }

    addEdge(edge: GraphEdge) {
        this.scheme.get(edge.from).add(edge.to);
        this.scheme.get(edge.to).add(edge.from);
        this.edges.add(edge);
    }
    
    removeEdge(edge: GraphEdge) {
        let from: GraphNode = edge.from;
        let to: GraphNode = edge.to;
        this.scheme.get(from).delete(to);
        this.scheme.get(to).delete(from);
        this.edges.delete(edge);
    }

    nodeExists(node: GraphNode): boolean {
        return this.scheme.has(node);
    }

    clearDemo() {
        this.edges.forEach((edge) => {
            if (edge.hasState("path"))
                this.edges.delete(edge);
        });
    }

    runTransferDemo() {
        this.clearDemo();
        if (this.sourceNode !== null && this.targetNode !== null) {
            let route = this.findRoute(this.sourceNode, this.targetNode);
            if (route.length > 0) {
                let prev = this.sourceNode;
                for (let node of route) {
                    let edge = new GraphEdge(prev, node);
                    edge.setState("path");
                    this.edges.add(edge);
                    prev = node;
                }
            } else {
                alert("Path not found");
            }
        } else {
            alert("Source or target doesn't labeled")
        }

        this.render();
    }

    findRoute(source: GraphNode, target: GraphNode): Array<GraphNode> {
        let q = new Queue<GraphNode>();
        q.push(source);
        let p = new Map<GraphNode, GraphNode>();
        let used = new Set<GraphNode>();
        used.add(source)
        while (q.size() > 0) {
            let current = q.pop();

            this.scheme.get(current).forEach((next) => {
                if (!used.has(next)) {
                    used.add(next);
                    q.push(next);
                    p.set(next, current);
                }
            });
        }

        if (!used.has(target)) {
            return [];
        } else {
            let route = [target];
            let node = target;
            while (node !== source) {
                node = p.get(node);
                route.push(node);
            }

            return route.reverse();
        }
    }

    render() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.edges.forEach((edge) => {
            edge.render(this.context);
        });
        this.nodes.forEach((node) => {
            node.render(this.context);
        });
    }
}

class GraphObject {
    states: Set<string>;

    constructor() {
        this.states = new Set();
    }

    render(context: CanvasRenderingContext2D) {}

    setState(state: string) {
        this.states.add(state);
    }

    removeState(state: string) {
        this.states.delete(state);
    }

    hasState(state: string): boolean {
        return this.states.has(state);
    }
}

class GraphNode extends GraphObject {
    x: number;
    y: number;
    radius = 20;

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
    }

    render(context: CanvasRenderingContext2D) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);

        if (this.hasState("selected")) {
            context.fillStyle = "#86fa09";
        } else if (this.hasState("hovered")) {
            context.fillStyle = "#3db9a6";
        } else {
            context.fillStyle = "#3f3f3f";
        }

        context.fill();

        context.fillStyle = "#FFFFFF";
        context.font = "32px serif";
        if (this.hasState("target")) {
            context.fillText("T", this.x - this.radius / 2, this.y + this.radius / 2);
        }
        if (this.hasState("source")) {
            context.fillText("S", this.x - this.radius / 2, this.y + this.radius / 2);
        }
    }
}

class GraphEdge extends GraphObject {
    from: GraphNode;
    to: GraphNode;

    constructor(from: GraphNode, to: GraphNode) {
        super();
        this.from = from;
        this.to = to;
    }

    render(context: CanvasRenderingContext2D) {
        context.beginPath();
        context.moveTo(this.from.x, this.from.y);
        context.lineTo(this.to.x, this.to.y);

        if (this.hasState("path")) {
            context.strokeStyle = "#ff0000";
        } else if (this.hasState("hovered")) {
            context.strokeStyle = "#3db9a6";
        } else {
            context.strokeStyle = "#3f3f3f";
        }

        context.lineWidth = 5;
        context.stroke();
    }
}
